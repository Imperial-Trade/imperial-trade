-- Add OneSignal tracking columns to profiles table for persistent subscription management
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onesignal_player_id TEXT,
ADD COLUMN IF NOT EXISTS onesignal_subscription_status TEXT DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS onesignal_last_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS push_subscription_active BOOLEAN DEFAULT false;

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_profiles_onesignal_player_id ON public.profiles(onesignal_player_id);
CREATE INDEX IF NOT EXISTS idx_profiles_push_subscription_active ON public.profiles(push_subscription_active);

-- Add helpful comments
COMMENT ON COLUMN public.profiles.onesignal_player_id IS 'OneSignal player ID for push notifications';
COMMENT ON COLUMN public.profiles.onesignal_subscription_status IS 'Current OneSignal subscription status: unknown, subscribed, unsubscribed';
COMMENT ON COLUMN public.profiles.onesignal_last_verified_at IS 'Last time OneSignal subscription was verified';
COMMENT ON COLUMN public.profiles.push_subscription_active IS 'Whether user has active push subscription';