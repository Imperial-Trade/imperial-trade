-- Add unique constraints and indexes to device_subscriptions for data integrity
-- This prevents duplicate entries and enables proper upserts

-- Add unique constraint on user_id + device_fingerprint (one record per user per device)
ALTER TABLE public.device_subscriptions 
ADD CONSTRAINT device_subscriptions_user_device_unique 
UNIQUE (user_id, device_fingerprint);

-- Add unique constraint on onesignal_player_id (each Player ID should be unique)
ALTER TABLE public.device_subscriptions 
ADD CONSTRAINT device_subscriptions_player_id_unique 
UNIQUE (onesignal_player_id);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_device_subscriptions_user_active 
ON public.device_subscriptions(user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_device_subscriptions_device_fingerprint 
ON public.device_subscriptions(device_fingerprint);

CREATE INDEX IF NOT EXISTS idx_device_subscriptions_last_seen 
ON public.device_subscriptions(last_seen_at DESC);

-- Add function to check if device should show OneSignal prompt
CREATE OR REPLACE FUNCTION public.should_show_onesignal_prompt(p_user_id uuid, p_device_fingerprint text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  device_exists BOOLEAN := false;
BEGIN
  -- Check if this specific device already has an active subscription
  SELECT EXISTS(
    SELECT 1 FROM public.device_subscriptions 
    WHERE user_id = p_user_id 
      AND device_fingerprint = p_device_fingerprint 
      AND is_active = true
  ) INTO device_exists;
  
  -- Return true if device doesn't exist (needs prompt)
  RETURN NOT device_exists;
END;
$$;

-- Add function to get user's active devices
CREATE OR REPLACE FUNCTION public.get_user_active_devices(p_user_id uuid)
RETURNS TABLE(device_fingerprint text, onesignal_player_id text, device_info jsonb, last_seen_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ds.device_fingerprint,
    ds.onesignal_player_id,
    ds.device_info,
    ds.last_seen_at
  FROM public.device_subscriptions ds
  WHERE ds.user_id = p_user_id 
    AND ds.is_active = true
  ORDER BY ds.last_seen_at DESC;
END;
$$;