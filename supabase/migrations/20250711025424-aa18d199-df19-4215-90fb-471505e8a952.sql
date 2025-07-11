
-- Update user_type enum to include educator and ib_partner
ALTER TYPE user_type_enum ADD VALUE IF NOT EXISTS 'educator';
ALTER TYPE user_type_enum ADD VALUE IF NOT EXISTS 'ib_partner';

-- Create webhook events tracking table for reliability and audit trails
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  payload JSONB NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE,
  retry_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create educator signal analytics table for performance tracking
CREATE TABLE IF NOT EXISTS public.educator_signal_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  educator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_id UUID NOT NULL REFERENCES trade_alerts(id) ON DELETE CASCADE,
  followers_count INTEGER DEFAULT 0,
  engagement_score NUMERIC DEFAULT 0,
  performance_score NUMERIC DEFAULT 0,
  total_views INTEGER DEFAULT 0,
  total_copies INTEGER DEFAULT 0,
  success_rate NUMERIC DEFAULT 0,
  avg_profit_loss NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(educator_id, signal_id)
);

-- Create signal followers table for tracking
CREATE TABLE IF NOT EXISTS public.signal_followers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  signal_id UUID NOT NULL REFERENCES trade_alerts(id) ON DELETE CASCADE,
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  followed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notification_preferences JSONB DEFAULT '{"email": true, "push": true, "discord": false, "telegram": false}',
  UNIQUE(signal_id, follower_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at);
CREATE INDEX IF NOT EXISTS idx_educator_analytics_educator_id ON educator_signal_analytics(educator_id);
CREATE INDEX IF NOT EXISTS idx_signal_followers_signal_id ON signal_followers(signal_id);

-- Enable RLS on new tables
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.educator_signal_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signal_followers ENABLE ROW LEVEL SECURITY;

-- RLS policies for webhook_events (admin only)
CREATE POLICY "Admins can manage webhook events" ON public.webhook_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND (profiles.role = 'admin' OR profiles.access_level = 'admin')
    )
  );

-- RLS policies for educator_signal_analytics
CREATE POLICY "Educators can view their own analytics" ON public.educator_signal_analytics
  FOR SELECT USING (
    auth.uid() = educator_id OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND (profiles.role = 'admin' OR profiles.access_level = 'admin')
    )
  );

CREATE POLICY "System can manage educator analytics" ON public.educator_signal_analytics
  FOR ALL USING (true);

-- RLS policies for signal_followers
CREATE POLICY "Users can manage their own follows" ON public.signal_followers
  FOR ALL USING (auth.uid() = follower_id);

CREATE POLICY "Educators can view their signal followers" ON public.signal_followers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trade_alerts 
      WHERE trade_alerts.id = signal_id 
      AND trade_alerts.user_id = auth.uid()
    )
  );

-- Create materialized view for real-time educator performance
CREATE MATERIALIZED VIEW IF NOT EXISTS public.educator_performance_summary AS
SELECT 
  p.id as educator_id,
  p.display_name,
  COUNT(ta.id) as total_signals,
  COUNT(CASE WHEN ta.status = 'active' THEN 1 END) as active_signals,
  COUNT(CASE WHEN ta.status = 'closed' THEN 1 END) as closed_signals,
  COALESCE(AVG(esa.success_rate), 0) as avg_success_rate,
  COALESCE(AVG(esa.performance_score), 0) as avg_performance_score,
  COALESCE(SUM(esa.followers_count), 0) as total_followers,
  COALESCE(SUM(esa.total_views), 0) as total_views,
  COALESCE(SUM(esa.total_copies), 0) as total_copies
FROM public.profiles p
LEFT JOIN public.trade_alerts ta ON p.id = ta.user_id
LEFT JOIN public.educator_signal_analytics esa ON ta.id = esa.signal_id
WHERE p.user_type IN ('educator', 'ib_partner')
GROUP BY p.id, p.display_name;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_educator_performance_summary_id ON educator_performance_summary(educator_id);

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_educator_performance()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY educator_performance_summary;
END;
$$;

-- Trigger to update webhook events updated_at
CREATE OR REPLACE FUNCTION update_webhook_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER webhook_events_updated_at
  BEFORE UPDATE ON webhook_events
  FOR EACH ROW
  EXECUTE FUNCTION update_webhook_events_updated_at();

-- Trigger to update educator analytics updated_at
CREATE TRIGGER educator_analytics_updated_at
  BEFORE UPDATE ON educator_signal_analytics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
