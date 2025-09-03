
-- Migration: Align profiles table with notification features used by frontend and DB functions

-- 1) Ensure required columns exist on public.profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS push_subscription_active BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onesignal_player_id TEXT,
  ADD COLUMN IF NOT EXISTS onesignal_subscription_status TEXT NOT NULL DEFAULT 'unsubscribed';

-- 2) Backfill nulls defensively (in case any column existed without defaults)
UPDATE public.profiles
SET
  email_notifications = COALESCE(email_notifications, true),
  notification_preferences = COALESCE(notification_preferences, '{}'::jsonb),
  push_subscription_active = COALESCE(push_subscription_active, false),
  onesignal_subscription_status = COALESCE(onesignal_subscription_status, 'unsubscribed')
WHERE
  email_notifications IS NULL
  OR notification_preferences IS NULL
  OR push_subscription_active IS NULL
  OR onesignal_subscription_status IS NULL;

-- 3) Indexes for common filters used in existing functions/queries
CREATE INDEX IF NOT EXISTS idx_profiles_push_subscription_active
  ON public.profiles (push_subscription_active);

CREATE INDEX IF NOT EXISTS idx_profiles_onesignal_subscription_status
  ON public.profiles (onesignal_subscription_status);

-- 4) Ensure RLS is enabled and users can manage their own notification fields
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Users can view own profile'
  ) THEN
    CREATE POLICY "Users can view own profile"
      ON public.profiles
      FOR SELECT
      USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile"
      ON public.profiles
      FOR UPDATE
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END
$$;

-- 5) Documentation to help future maintainers
COMMENT ON COLUMN public.profiles.email_notifications IS
  'User opt-in for receiving email notifications. Defaults to true.';
COMMENT ON COLUMN public.profiles.notification_preferences IS
  'Granular notification preferences JSON (e.g., signal/TP/SL/market/system flags). Defaults to empty object.';
COMMENT ON COLUMN public.profiles.push_subscription_active IS
  'Whether the user currently has an active web push subscription. Defaults to false.';
COMMENT ON COLUMN public.profiles.onesignal_player_id IS
  'Most recently registered OneSignal Player ID for this user (text).';
COMMENT ON COLUMN public.profiles.onesignal_subscription_status IS
  'OneSignal subscription state (text), e.g., subscribed|unsubscribed. Defaults to unsubscribed.';
