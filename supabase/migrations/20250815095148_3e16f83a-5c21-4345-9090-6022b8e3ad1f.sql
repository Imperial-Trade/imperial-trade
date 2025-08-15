-- Fix OneSignal monitoring and user notification tables

-- Create user_notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on user_notifications
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.user_notifications;
CREATE POLICY "Users can view their own notifications" 
ON public.user_notifications 
FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.user_notifications;
CREATE POLICY "Users can update their own notifications" 
ON public.user_notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can create notifications" ON public.user_notifications;
CREATE POLICY "System can create notifications" 
ON public.user_notifications 
FOR INSERT 
WITH CHECK (true);

-- Create function to check if user should receive notifications
CREATE OR REPLACE FUNCTION public.should_user_receive_notification(
  p_user_id UUID,
  p_signal_author_id UUID,
  p_notification_type TEXT,
  p_priority_level INTEGER DEFAULT 1
) RETURNS BOOLEAN
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- Always allow notifications for now (can be enhanced later with user preferences)
  -- Don't send to signal creator unless specifically requested
  IF p_user_id = p_signal_author_id AND p_notification_type != 'signal_created' THEN
    RETURN false;
  END IF;
  
  -- Check if user has push notifications enabled
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = p_user_id 
    AND push_subscription_active = true 
    AND onesignal_player_id IS NOT NULL
    AND onesignal_subscription_status = 'subscribed'
  );
END;
$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON public.user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON public.user_notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_user_notifications_is_read ON public.user_notifications(is_read);

-- Update profiles table to reset broken OneSignal states
UPDATE public.profiles 
SET 
  push_subscription_active = false,
  onesignal_subscription_status = 'unknown',
  onesignal_last_verified_at = NULL
WHERE push_subscription_active = true 
  AND (onesignal_player_id IS NULL OR onesignal_player_id = '');

-- Add updated_at trigger for user_notifications
DROP TRIGGER IF EXISTS update_user_notifications_updated_at ON public.user_notifications;
CREATE TRIGGER update_user_notifications_updated_at
  BEFORE UPDATE ON public.user_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();