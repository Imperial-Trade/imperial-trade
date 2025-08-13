-- Create delivery tracking table for push notifications
CREATE TABLE public.push_notification_deliveries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  notification_id TEXT NOT NULL,
  onesignal_id TEXT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  delivered_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'opened', 'failed')),
  error_message TEXT,
  platform TEXT,
  device_type TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user notification preferences table
CREATE TABLE public.user_notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  sms_enabled BOOLEAN NOT NULL DEFAULT false,
  trading_signals BOOLEAN NOT NULL DEFAULT true,
  market_updates BOOLEAN NOT NULL DEFAULT true,
  educational_content BOOLEAN NOT NULL DEFAULT true,
  community_activity BOOLEAN NOT NULL DEFAULT true,
  system_announcements BOOLEAN NOT NULL DEFAULT true,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  timezone TEXT DEFAULT 'UTC',
  frequency_limit INTEGER DEFAULT 10, -- max notifications per day
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notification performance analytics table
CREATE TABLE public.notification_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  total_sent INTEGER NOT NULL DEFAULT 0,
  total_delivered INTEGER NOT NULL DEFAULT 0,
  total_opened INTEGER NOT NULL DEFAULT 0,
  total_failed INTEGER NOT NULL DEFAULT 0,
  avg_delivery_time_seconds INTEGER,
  platform_breakdown JSONB DEFAULT '{}',
  error_breakdown JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(date)
);

-- Enable RLS on all tables
ALTER TABLE public.push_notification_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for push_notification_deliveries
CREATE POLICY "Users can view their own delivery history"
  ON public.push_notification_deliveries
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all delivery history"
  ON public.push_notification_deliveries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "System can insert delivery records"
  ON public.push_notification_deliveries
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update delivery records"
  ON public.push_notification_deliveries
  FOR UPDATE
  USING (true);

-- Create RLS policies for user_notification_preferences
CREATE POLICY "Users can manage their own notification preferences"
  ON public.user_notification_preferences
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all notification preferences"
  ON public.user_notification_preferences
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create RLS policies for notification_analytics
CREATE POLICY "Admins can access notification analytics"
  ON public.notification_analytics
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create indexes for performance
CREATE INDEX idx_push_deliveries_user_id ON public.push_notification_deliveries(user_id);
CREATE INDEX idx_push_deliveries_status ON public.push_notification_deliveries(status);
CREATE INDEX idx_push_deliveries_sent_at ON public.push_notification_deliveries(sent_at);
CREATE INDEX idx_notification_preferences_user_id ON public.user_notification_preferences(user_id);
CREATE INDEX idx_notification_analytics_date ON public.notification_analytics(date);

-- Create trigger for updated_at columns
CREATE TRIGGER update_push_deliveries_updated_at
  BEFORE UPDATE ON public.push_notification_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_preferences_updated_at
  BEFORE UPDATE ON public.user_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_analytics_updated_at
  BEFORE UPDATE ON public.notification_analytics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();