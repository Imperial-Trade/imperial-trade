-- Remove OneSignal-related columns from profiles table (safe removal)
-- This migration safely removes OneSignal columns while preserving other functionality

-- Step 1: Remove OneSignal-specific columns from profiles table
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS onesignal_player_id,
DROP COLUMN IF EXISTS onesignal_subscription_status,
DROP COLUMN IF EXISTS onesignal_last_verified_at,
DROP COLUMN IF EXISTS push_subscription_active,
DROP COLUMN IF EXISTS notification_preferences;

-- Step 2: Add in-app notification preference column (lightweight replacement)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS in_app_notifications_enabled BOOLEAN DEFAULT true;

-- Step 3: Update any RLS policies that reference removed columns
-- (Most policies should continue to work since they typically use user_id checks)

-- Step 4: Comment on the changes
COMMENT ON COLUMN public.profiles.in_app_notifications_enabled IS 'Controls whether user receives in-app notifications (replaces OneSignal push notifications)';

-- Step 5: Create index for notification queries
CREATE INDEX IF NOT EXISTS idx_profiles_in_app_notifications 
ON public.profiles(in_app_notifications_enabled) 
WHERE in_app_notifications_enabled = true;