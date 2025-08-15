-- Fix OneSignal upsert function by removing references to non-existent last_notification_sync column
-- and enhance profiles table for better notification tracking
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onesignal_last_sync_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS notification_prompt_dismissed_at timestamp with time zone DEFAULT NULL;