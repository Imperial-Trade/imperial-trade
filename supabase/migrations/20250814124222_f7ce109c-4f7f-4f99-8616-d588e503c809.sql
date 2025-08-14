-- PHASE 1: Fix Critical Database Trigger Issues
-- Remove all existing duplicate triggers first
DROP TRIGGER IF EXISTS trigger_auto_notify_signal_creation ON public.trade_alerts;
DROP TRIGGER IF EXISTS auto_notify_signal_creation_trigger ON public.trade_alerts;
DROP TRIGGER IF EXISTS auto_notify_trigger ON public.trade_alerts;

-- Create single, properly timed AFTER INSERT trigger
CREATE TRIGGER trigger_auto_notify_signal_creation
  AFTER INSERT ON public.trade_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_notify_signal_creation();

-- PHASE 3: Create Push Subscription Infrastructure
-- Create push_subscriptions table to properly track OneSignal subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  onesignal_player_id TEXT NOT NULL,
  platform TEXT NOT NULL, -- 'web', 'ios', 'android'
  subscription_active BOOLEAN NOT NULL DEFAULT true,
  tags JSONB DEFAULT '{}',
  external_user_id TEXT,
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, onesignal_player_id)
);

-- Enable RLS on push_subscriptions
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for push_subscriptions
CREATE POLICY "Users can manage their own push subscriptions"
  ON public.push_subscriptions
  FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage all push subscriptions"
  ON public.push_subscriptions
  FOR ALL
  USING (true);

-- Create user_notification_preferences table
CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  signal_notifications BOOLEAN NOT NULL DEFAULT true,
  market_alerts BOOLEAN NOT NULL DEFAULT true,
  educational_content BOOLEAN NOT NULL DEFAULT true,
  live_sessions BOOLEAN NOT NULL DEFAULT true,
  community_updates BOOLEAN NOT NULL DEFAULT false,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  timezone TEXT DEFAULT 'UTC',
  frequency_limit INTEGER DEFAULT 50, -- max notifications per day
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS on user_notification_preferences
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for notification preferences
CREATE POLICY "Users can manage their own notification preferences"
  ON public.user_notification_preferences
  FOR ALL
  USING (auth.uid() = user_id);

-- Create notification_delivery_log table for tracking
CREATE TABLE IF NOT EXISTS public.notification_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_id UUID REFERENCES public.trade_alerts(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  delivery_channel TEXT NOT NULL, -- 'push', 'email', 'sms'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed'
  onesignal_notification_id TEXT,
  external_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS on notification_delivery_log
ALTER TABLE public.notification_delivery_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for delivery log
CREATE POLICY "Users can view their own notification delivery log"
  ON public.notification_delivery_log
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage all notification delivery logs"
  ON public.notification_delivery_log
  FOR ALL
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON public.push_subscriptions(subscription_active) WHERE subscription_active = true;
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON public.user_notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_log_user_signal ON public.notification_delivery_log(user_id, signal_id);
CREATE INDEX IF NOT EXISTS idx_delivery_log_status ON public.notification_delivery_log(status);

-- Add updated_at trigger for tables
CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON public.user_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_delivery_log_updated_at
  BEFORE UPDATE ON public.notification_delivery_log
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();