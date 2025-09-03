-- Add OneSignal App ID to Supabase secrets for consistent configuration
-- Ensure all required notification fields exist in profiles table

-- Add missing notification fields if they don't exist
DO $$ 
BEGIN
  -- Check and add xeon_stream_subscription if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='xeon_stream_subscription') THEN
    ALTER TABLE public.profiles ADD COLUMN xeon_stream_subscription boolean DEFAULT false;
  END IF;
  
  -- Check and add xeon_stream_activated_at if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='xeon_stream_activated_at') THEN
    ALTER TABLE public.profiles ADD COLUMN xeon_stream_activated_at timestamp with time zone;
  END IF;
  
  -- Ensure notification preferences are properly structured
  UPDATE public.profiles 
  SET notification_preferences = COALESCE(notification_preferences, '{}')::jsonb || 
      jsonb_build_object(
        'push', COALESCE((notification_preferences->>'push')::boolean, true),
        'in_app', COALESCE((notification_preferences->>'in_app')::boolean, true),
        'discord', COALESCE((notification_preferences->>'discord')::boolean, false),
        'telegram', COALESCE((notification_preferences->>'telegram')::boolean, false),
        'xeon_stream', COALESCE((notification_preferences->>'xeon_stream')::boolean, false)
      )
  WHERE notification_preferences IS NULL OR NOT (notification_preferences ? 'xeon_stream');
END $$;