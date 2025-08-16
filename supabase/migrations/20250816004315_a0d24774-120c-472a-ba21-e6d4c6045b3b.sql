-- Add notification performance tracking columns
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS notification_stats JSONB DEFAULT '{
  "total_sent": 0,
  "total_delivered": 0,
  "total_opened": 0,
  "last_notification_at": null,
  "engagement_score": 0,
  "preferred_delivery_time": null
}'::jsonb;

-- Enhanced notification delivery attempts table
CREATE TABLE IF NOT EXISTS public.notification_delivery_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id UUID REFERENCES public.notification_delivery_log(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  delivery_channel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_code TEXT,
  error_message TEXT,
  response_data JSONB DEFAULT '{}'::jsonb,
  attempt_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  delivered_at TIMESTAMP WITH TIME ZONE,
  retry_after TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_delivery_attempts ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "System can manage all notification delivery attempts" 
ON public.notification_delivery_attempts 
FOR ALL 
USING (true);

-- Enhanced batch queue
ALTER TABLE public.notification_batch_queue 
ADD COLUMN IF NOT EXISTS batch_key TEXT,
ADD COLUMN IF NOT EXISTS priority_level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS asset_symbol TEXT,
ADD COLUMN IF NOT EXISTS notification_category TEXT DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS market_session TEXT;