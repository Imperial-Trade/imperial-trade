-- Phase 2: Enhanced notification content and user preferences
-- Create user notification preferences table
CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Signal notification preferences
  signal_created BOOLEAN NOT NULL DEFAULT true,
  signal_updated BOOLEAN NOT NULL DEFAULT true,
  signal_closed BOOLEAN NOT NULL DEFAULT true,
  tp_hits BOOLEAN NOT NULL DEFAULT true,
  stop_loss_hits BOOLEAN NOT NULL DEFAULT true,
  price_alerts BOOLEAN NOT NULL DEFAULT true,
  
  -- Delivery channel preferences
  push_notifications BOOLEAN NOT NULL DEFAULT true,
  in_app_notifications BOOLEAN NOT NULL DEFAULT true,
  discord_notifications BOOLEAN NOT NULL DEFAULT false,
  telegram_notifications BOOLEAN NOT NULL DEFAULT false,
  
  -- Advanced preferences
  include_own_signals BOOLEAN NOT NULL DEFAULT false,
  minimum_priority_level INTEGER NOT NULL DEFAULT 1,
  quiet_hours_start TIME WITHOUT TIME ZONE,
  quiet_hours_end TIME WITHOUT TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(user_id)
);

-- Enable RLS on notification preferences
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for notification preferences
CREATE POLICY "Users can manage their own notification preferences"
ON public.user_notification_preferences
FOR ALL
USING (auth.uid() = user_id);

-- Create updated_at trigger for notification preferences
CREATE TRIGGER update_user_notification_preferences_updated_at
  BEFORE UPDATE ON public.user_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create table for notification batching and deduplication
CREATE TABLE IF NOT EXISTS public.notification_batch_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  signal_id UUID NOT NULL,
  user_id UUID NOT NULL,
  notification_types TEXT[] NOT NULL DEFAULT '{}',
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  delivery_status JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Prevent duplicate notifications for same signal/user combination
  UNIQUE(signal_id, user_id)
);

-- Enable RLS on notification batch queue  
ALTER TABLE public.notification_batch_queue ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for notification batch queue
CREATE POLICY "System can manage notification batch queue"
ON public.notification_batch_queue
FOR ALL
USING (true);

-- Create function to get user notification preferences with defaults
CREATE OR REPLACE FUNCTION public.get_user_notification_preferences(p_user_id UUID)
RETURNS TABLE (
  signal_created BOOLEAN,
  signal_updated BOOLEAN, 
  signal_closed BOOLEAN,
  tp_hits BOOLEAN,
  stop_loss_hits BOOLEAN,
  price_alerts BOOLEAN,
  push_notifications BOOLEAN,
  in_app_notifications BOOLEAN,
  discord_notifications BOOLEAN,
  telegram_notifications BOOLEAN,
  include_own_signals BOOLEAN,
  minimum_priority_level INTEGER,
  quiet_hours_start TIME WITHOUT TIME ZONE,
  quiet_hours_end TIME WITHOUT TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(unp.signal_created, true),
    COALESCE(unp.signal_updated, true),
    COALESCE(unp.signal_closed, true),
    COALESCE(unp.tp_hits, true),
    COALESCE(unp.stop_loss_hits, true),
    COALESCE(unp.price_alerts, true),
    COALESCE(unp.push_notifications, true),
    COALESCE(unp.in_app_notifications, true),
    COALESCE(unp.discord_notifications, false),
    COALESCE(unp.telegram_notifications, false),
    COALESCE(unp.include_own_signals, false),
    COALESCE(unp.minimum_priority_level, 1),
    unp.quiet_hours_start,
    unp.quiet_hours_end
  FROM public.user_notification_preferences unp
  WHERE unp.user_id = p_user_id
  
  UNION ALL
  
  -- Return defaults if no preferences found
  SELECT 
    true, true, true, true, true, true, -- All signal types enabled
    true, true, false, false, -- Push and in-app enabled, others disabled
    false, 1, -- Don't include own signals, min priority 1
    NULL::TIME, NULL::TIME -- No quiet hours
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_notification_preferences 
    WHERE user_id = p_user_id
  )
  LIMIT 1;
END;
$function$;

-- Create function to check if user should receive notification
CREATE OR REPLACE FUNCTION public.should_user_receive_notification(
  p_user_id UUID,
  p_signal_creator_id UUID,
  p_notification_type TEXT,
  p_priority_level INTEGER DEFAULT 1
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  prefs RECORD;
  current_time TIME;
  is_quiet_hours BOOLEAN := false;
BEGIN
  -- Get user preferences
  SELECT * INTO prefs FROM public.get_user_notification_preferences(p_user_id);
  
  -- Check if user should receive their own signals
  IF p_signal_creator_id = p_user_id AND NOT prefs.include_own_signals THEN
    RETURN false;
  END IF;
  
  -- Check priority level
  IF p_priority_level < prefs.minimum_priority_level THEN
    RETURN false;
  END IF;
  
  -- Check quiet hours
  IF prefs.quiet_hours_start IS NOT NULL AND prefs.quiet_hours_end IS NOT NULL THEN
    current_time := CURRENT_TIME;
    
    -- Handle quiet hours that span midnight
    IF prefs.quiet_hours_start <= prefs.quiet_hours_end THEN
      is_quiet_hours := current_time BETWEEN prefs.quiet_hours_start AND prefs.quiet_hours_end;
    ELSE
      is_quiet_hours := current_time >= prefs.quiet_hours_start OR current_time <= prefs.quiet_hours_end;
    END IF;
    
    -- During quiet hours, only allow critical notifications (stop loss)
    IF is_quiet_hours AND p_notification_type != 'stop_loss' AND p_priority_level < 3 THEN
      RETURN false;
    END IF;
  END IF;
  
  -- Check specific notification type preferences
  CASE p_notification_type
    WHEN 'signal_created' THEN
      RETURN prefs.signal_created;
    WHEN 'signal_updated' THEN
      RETURN prefs.signal_updated;
    WHEN 'signal_closed' THEN
      RETURN prefs.signal_closed;
    WHEN 'tp_hits', 'take_profit_1', 'take_profit_2', 'take_profit_3', 'take_profit_4', 'take_profit_5' THEN
      RETURN prefs.tp_hits;
    WHEN 'stop_loss' THEN
      RETURN prefs.stop_loss_hits;
    WHEN 'price_alert' THEN
      RETURN prefs.price_alerts;
    ELSE
      RETURN true; -- Default to allowing unknown notification types
  END CASE;
END;
$function$;