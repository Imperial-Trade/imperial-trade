-- Create user notification preferences table for granular control
CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  push_enabled boolean NOT NULL DEFAULT true,
  email_enabled boolean NOT NULL DEFAULT true,
  trading_signals boolean NOT NULL DEFAULT true,
  market_updates boolean NOT NULL DEFAULT true,
  educational_content boolean NOT NULL DEFAULT true,
  community_activity boolean NOT NULL DEFAULT true,
  system_announcements boolean NOT NULL DEFAULT true,
  quiet_hours_start time without time zone DEFAULT NULL,
  quiet_hours_end time without time zone DEFAULT NULL,
  timezone text NOT NULL DEFAULT 'UTC',
  frequency_limit integer NOT NULL DEFAULT 10,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies for user notification preferences
CREATE POLICY "Users can manage their own notification preferences" 
ON public.user_notification_preferences 
FOR ALL 
USING (auth.uid() = user_id);

-- Create notification types enum for future use
CREATE TYPE public.notification_type AS ENUM (
  'signal_created',
  'signal_updated', 
  'signal_closed',
  'tp_hit',
  'sl_hit',
  'market_alert',
  'educational_content',
  'community_activity',
  'system_announcement'
);

-- Create notification delivery tracking table
CREATE TABLE IF NOT EXISTS public.user_notification_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type public.notification_type NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  delivery_channels text[] NOT NULL DEFAULT '{push}',
  delivery_status jsonb NOT NULL DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  signal_id uuid DEFAULT NULL,
  scheduled_for timestamp with time zone DEFAULT NULL,
  sent_at timestamp with time zone DEFAULT NULL,
  opened_at timestamp with time zone DEFAULT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_notification_history ENABLE ROW LEVEL SECURITY;

-- Create policies for notification history
CREATE POLICY "Users can view their own notification history" 
ON public.user_notification_history 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can manage all notification history" 
ON public.user_notification_history 
FOR ALL 
USING (true);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_user_id ON public.user_notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notification_history_user_id ON public.user_notification_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notification_history_type ON public.user_notification_history(notification_type);
CREATE INDEX IF NOT EXISTS idx_user_notification_history_signal_id ON public.user_notification_history(signal_id);

-- Add trigger for updated_at
CREATE TRIGGER update_user_notification_preferences_updated_at
  BEFORE UPDATE ON public.user_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();