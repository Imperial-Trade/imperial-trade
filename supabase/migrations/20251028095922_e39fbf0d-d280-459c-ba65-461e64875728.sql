-- Add device token columns to profiles table for Capacitor mobile app support
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS device_token TEXT,
ADD COLUMN IF NOT EXISTS device_platform TEXT DEFAULT 'web',
ADD COLUMN IF NOT EXISTS device_token_updated_at TIMESTAMPTZ;

-- Create index for faster device token lookups
CREATE INDEX IF NOT EXISTS idx_profiles_device_token ON profiles(device_token) WHERE device_token IS NOT NULL;

-- Create index for platform-specific queries
CREATE INDEX IF NOT EXISTS idx_profiles_device_platform ON profiles(device_platform) WHERE device_platform IS NOT NULL;

COMMENT ON COLUMN profiles.device_token IS 'FCM/APNS device token for push notifications';
COMMENT ON COLUMN profiles.device_platform IS 'Platform type: web, ios, or android';
COMMENT ON COLUMN profiles.device_token_updated_at IS 'Last time device token was updated';
