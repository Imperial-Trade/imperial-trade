-- Phase 1.1: Enhanced Notification Preferences Schema
-- Add comprehensive notification preferences to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "alerts": {
    "critical": {"push": true, "in_app": true, "email": true, "sound": "high"},
    "important": {"push": true, "in_app": true, "email": false, "sound": "medium"}, 
    "standard": {"push": true, "in_app": true, "email": false, "sound": "low"},
    "info": {"push": false, "in_app": true, "email": false, "sound": "none"}
  },
  "trading": {
    "signal_created": {"enabled": true, "priority": "high", "sound": "signal_alert"},
    "signal_updated": {"enabled": true, "priority": "medium", "sound": "update_chime"},
    "price_alerts": {"enabled": true, "priority": "high", "sound": "price_alert"},
    "tp_hit": {"enabled": true, "priority": "high", "sound": "success_ding"},
    "stop_loss": {"enabled": true, "priority": "critical", "sound": "warning_tone"}
  },
  "schedule": {
    "quiet_hours": {"enabled": false, "start": "22:00", "end": "07:00"},
    "market_hours_only": false,
    "weekend_alerts": true
  },
  "channels": {
    "push": {"enabled": true, "priority_threshold": "standard"},
    "in_app": {"enabled": true, "priority_threshold": "info"},
    "email": {"enabled": false, "priority_threshold": "critical"}
  },
  "device": {
    "vibration": true,
    "led_flash": false,
    "priority_bypass": true
  }
}'::jsonb;

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

-- Enhanced notification delivery log with retry mechanism
CREATE TABLE IF NOT EXISTS public.notification_delivery_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id UUID REFERENCES public.notification_delivery_log(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  delivery_channel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, delivered, failed, retrying
  error_code TEXT,
  error_message TEXT,
  response_data JSONB DEFAULT '{}'::jsonb,
  attempt_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  delivered_at TIMESTAMP WITH TIME ZONE,
  retry_after TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new table
ALTER TABLE public.notification_delivery_attempts ENABLE ROW LEVEL SECURITY;

-- RLS policies for notification delivery attempts
CREATE POLICY "System can manage all notification delivery attempts" 
ON public.notification_delivery_attempts 
FOR ALL 
USING (true);

CREATE POLICY "Admins can view all notification delivery attempts" 
ON public.notification_delivery_attempts 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND access_level = 'admin'::access_level_enum
));

-- Enhanced notification batch queue with smart batching
ALTER TABLE public.notification_batch_queue 
ADD COLUMN IF NOT EXISTS batch_key TEXT,
ADD COLUMN IF NOT EXISTS priority_level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS asset_symbol TEXT,
ADD COLUMN IF NOT EXISTS notification_category TEXT DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS market_session TEXT,
ADD COLUMN IF NOT EXISTS device_preferences JSONB DEFAULT '{}'::jsonb;

-- Smart notification batching function
CREATE OR REPLACE FUNCTION public.create_smart_notification_batch(
  p_signal_id UUID,
  p_notification_type TEXT,
  p_priority_level INTEGER DEFAULT 1,
  p_asset_symbol TEXT DEFAULT NULL,
  p_market_session TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  batch_id UUID;
  target_users UUID[];
  batch_key TEXT;
BEGIN
  -- Generate smart batch key for grouping similar notifications
  batch_key := p_notification_type || '_' || COALESCE(p_asset_symbol, 'general') || '_' || 
               EXTRACT(EPOCH FROM date_trunc('minute', now()));
  
  -- Get eligible users based on notification preferences
  SELECT array_agg(p.id) INTO target_users
  FROM public.profiles p
  WHERE p.account_status = 'active'
  AND p.push_subscription_active = true
  AND p.onesignal_player_id IS NOT NULL
  AND p.onesignal_subscription_status = 'subscribed'
  AND (
    p.notification_preferences->'trading'->p_notification_type->>'enabled' = 'true'
    OR p.notification_preferences IS NULL -- Default to enabled for users without preferences
  );
  
  -- Create batch notification entries
  INSERT INTO public.notification_batch_queue (
    signal_id, 
    user_id, 
    notification_types, 
    batch_key,
    priority_level,
    asset_symbol,
    notification_category,
    market_session,
    scheduled_at
  )
  SELECT 
    p_signal_id,
    unnest(target_users),
    ARRAY[p_notification_type],
    batch_key,
    p_priority_level,
    p_asset_symbol,
    p_notification_type,
    p_market_session,
    now()
  WHERE array_length(target_users, 1) > 0;
  
  -- Return batch identifier
  SELECT gen_random_uuid() INTO batch_id;
  RETURN batch_id;
END;
$$;

-- Enhanced device subscription tracking with performance metrics
ALTER TABLE public.device_subscriptions 
ADD COLUMN IF NOT EXISTS notification_performance JSONB DEFAULT '{
  "delivery_success_rate": 100,
  "average_delivery_time_ms": 0,
  "last_successful_delivery": null,
  "failed_delivery_count": 0,
  "total_notifications_sent": 0
}'::jsonb,
ADD COLUMN IF NOT EXISTS device_capabilities JSONB DEFAULT '{
  "supports_actions": false,
  "supports_images": false,
  "supports_vibration": false,
  "max_title_length": 50,
  "max_body_length": 150
}'::jsonb;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_notification_batch_queue_batch_key ON public.notification_batch_queue(batch_key);
CREATE INDEX IF NOT EXISTS idx_notification_batch_queue_priority ON public.notification_batch_queue(priority_level DESC, scheduled_at ASC);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_attempts_status ON public.notification_delivery_attempts(status, retry_after);
CREATE INDEX IF NOT EXISTS idx_device_subscriptions_performance ON public.device_subscriptions USING GIN(notification_performance);