-- Add cross-device support for OneSignal push notifications
-- This allows users to receive push notifications on multiple devices/browsers

-- Add device tracking columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS device_fingerprint TEXT,
ADD COLUMN IF NOT EXISTS last_device_info JSONB DEFAULT '{}'::jsonb;

-- Create device_subscriptions table for multi-device support
CREATE TABLE IF NOT EXISTS public.device_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_fingerprint TEXT NOT NULL,
  onesignal_player_id TEXT NOT NULL,
  device_info JSONB DEFAULT '{}'::jsonb,
  browser_name TEXT,
  browser_version TEXT,
  platform TEXT,
  is_mobile BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Ensure unique device per user
  UNIQUE(user_id, device_fingerprint),
  -- Ensure unique player ID globally
  UNIQUE(onesignal_player_id)
);

-- Enable RLS on device_subscriptions
ALTER TABLE public.device_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for device_subscriptions
CREATE POLICY "Users can view their own device subscriptions"
ON public.device_subscriptions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own device subscriptions"
ON public.device_subscriptions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own device subscriptions"
ON public.device_subscriptions
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own device subscriptions"
ON public.device_subscriptions
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_device_subscriptions_user_id ON public.device_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_device_subscriptions_device_fingerprint ON public.device_subscriptions(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_device_subscriptions_active ON public.device_subscriptions(is_active) WHERE is_active = true;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_device_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_device_subscriptions_updated_at
  BEFORE UPDATE ON public.device_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_device_subscriptions_updated_at();

-- Function to get active devices for a user
CREATE OR REPLACE FUNCTION get_user_active_devices(p_user_id UUID)
RETURNS TABLE(
  device_fingerprint TEXT,
  onesignal_player_id TEXT,
  device_info JSONB,
  last_seen_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Function to check if device needs OneSignal prompt
CREATE OR REPLACE FUNCTION should_show_onesignal_prompt(p_user_id UUID, p_device_fingerprint TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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