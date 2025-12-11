-- ============================================
-- Migration: Enforce Max 2 Devices Per User
-- ============================================
-- This migration:
-- 1. Adds a function to enforce max 2 active devices per user
-- 2. When a 3rd device subscribes, the oldest device is automatically deactivated
-- 3. Adds device tracking columns for better monitoring
-- ============================================

-- Add device_name column for easier identification
ALTER TABLE public.device_subscriptions 
ADD COLUMN IF NOT EXISTS device_name TEXT DEFAULT 'Unknown Device';

-- Add subscription_order column to track device registration order
ALTER TABLE public.device_subscriptions 
ADD COLUMN IF NOT EXISTS subscription_order INTEGER DEFAULT 1;

-- Create index for efficient device ordering queries
CREATE INDEX IF NOT EXISTS idx_device_subscriptions_user_order 
ON public.device_subscriptions(user_id, subscription_order DESC, created_at DESC)
WHERE is_active = true;

-- ============================================
-- Function: Enforce Max 2 Devices Per User
-- ============================================
-- Called when a new device subscribes
-- Deactivates the oldest device if user has more than 2
CREATE OR REPLACE FUNCTION public.enforce_max_devices_per_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_active_device_count INTEGER;
  v_oldest_device_id UUID;
  v_max_devices INTEGER := 2; -- Maximum devices allowed per user
BEGIN
  -- Only process if this is a new active device or reactivation
  IF NEW.is_active = true THEN
    -- Count current active devices for this user (excluding the current one being inserted/updated)
    SELECT COUNT(*) INTO v_active_device_count
    FROM device_subscriptions
    WHERE user_id = NEW.user_id
      AND is_active = true
      AND id != NEW.id;

    -- If user already has max devices, deactivate the oldest one
    IF v_active_device_count >= v_max_devices THEN
      -- Find the oldest active device (by last_seen_at, then created_at)
      SELECT id INTO v_oldest_device_id
      FROM device_subscriptions
      WHERE user_id = NEW.user_id
        AND is_active = true
        AND id != NEW.id
      ORDER BY last_seen_at ASC NULLS FIRST, created_at ASC
      LIMIT 1;

      IF v_oldest_device_id IS NOT NULL THEN
        -- Deactivate the oldest device
        UPDATE device_subscriptions
        SET 
          is_active = false,
          updated_at = NOW()
        WHERE id = v_oldest_device_id;

        RAISE WARNING '📱 [Device Limit] User % exceeded max devices. Deactivated oldest device: %', 
          NEW.user_id, v_oldest_device_id;
      END IF;
    END IF;

    -- Update subscription order for the new device
    SELECT COALESCE(MAX(subscription_order), 0) + 1 INTO NEW.subscription_order
    FROM device_subscriptions
    WHERE user_id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger to enforce device limit
DROP TRIGGER IF EXISTS trigger_enforce_max_devices ON public.device_subscriptions;
CREATE TRIGGER trigger_enforce_max_devices
  BEFORE INSERT OR UPDATE ON public.device_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_max_devices_per_user();

-- ============================================
-- Function: Get User's Active Devices
-- ============================================
-- Returns all active devices for a user with their details
CREATE OR REPLACE FUNCTION public.get_user_active_devices(p_user_id UUID)
RETURNS TABLE (
  device_id UUID,
  device_fingerprint TEXT,
  device_name TEXT,
  platform TEXT,
  browser_name TEXT,
  is_mobile BOOLEAN,
  onesignal_player_id TEXT,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  subscription_order INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ds.id,
    ds.device_fingerprint,
    ds.device_name,
    ds.platform,
    ds.browser_name,
    ds.is_mobile,
    ds.onesignal_player_id,
    ds.last_seen_at,
    ds.created_at,
    ds.subscription_order
  FROM device_subscriptions ds
  WHERE ds.user_id = p_user_id
    AND ds.is_active = true
  ORDER BY ds.subscription_order DESC, ds.last_seen_at DESC;
END;
$$;

-- ============================================
-- Function: Manually Deactivate a Device
-- ============================================
-- Allows users to manually log out a specific device
CREATE OR REPLACE FUNCTION public.deactivate_user_device(
  p_user_id UUID,
  p_device_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_affected INTEGER;
BEGIN
  UPDATE device_subscriptions
  SET 
    is_active = false,
    updated_at = NOW()
  WHERE id = p_device_id
    AND user_id = p_user_id;

  GET DIAGNOSTICS v_affected = ROW_COUNT;
  
  IF v_affected > 0 THEN
    RAISE WARNING '📱 [Device] User % manually deactivated device: %', p_user_id, p_device_id;
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- ============================================
-- View: User Device Summary
-- ============================================
-- Provides a summary of device usage per user for admin dashboard
CREATE OR REPLACE VIEW public.user_device_summary AS
SELECT 
  p.id AS user_id,
  p.display_name,
  p.email,
  p.account_status,
  COUNT(ds.id) FILTER (WHERE ds.is_active = true) AS active_device_count,
  COUNT(ds.id) AS total_device_count,
  MAX(ds.last_seen_at) AS last_device_activity,
  ARRAY_AGG(
    CASE WHEN ds.is_active THEN 
      jsonb_build_object(
        'id', ds.id,
        'name', COALESCE(ds.device_name, 'Unknown'),
        'platform', ds.platform,
        'browser', ds.browser_name,
        'is_mobile', ds.is_mobile,
        'player_id', ds.onesignal_player_id,
        'last_seen', ds.last_seen_at
      )
    END
  ) FILTER (WHERE ds.is_active = true) AS active_devices
FROM profiles p
LEFT JOIN device_subscriptions ds ON p.id = ds.user_id
WHERE p.account_status = 'active'
GROUP BY p.id, p.display_name, p.email, p.account_status;

-- Grant access to the view for authenticated users (admins will use service role)
GRANT SELECT ON public.user_device_summary TO authenticated;

-- ============================================
-- Cleanup: Deactivate excess devices for existing users
-- ============================================
-- One-time cleanup to enforce 2-device limit on existing data
DO $$
DECLARE
  v_user RECORD;
  v_device RECORD;
  v_count INTEGER;
BEGIN
  -- Find users with more than 2 active devices
  FOR v_user IN 
    SELECT user_id, COUNT(*) as device_count
    FROM device_subscriptions
    WHERE is_active = true
    GROUP BY user_id
    HAVING COUNT(*) > 2
  LOOP
    v_count := 0;
    
    -- Keep only the 2 most recently active devices
    FOR v_device IN
      SELECT id
      FROM device_subscriptions
      WHERE user_id = v_user.user_id
        AND is_active = true
      ORDER BY last_seen_at DESC NULLS LAST, created_at DESC
      OFFSET 2
    LOOP
      UPDATE device_subscriptions
      SET is_active = false, updated_at = NOW()
      WHERE id = v_device.id;
      
      v_count := v_count + 1;
    END LOOP;
    
    RAISE NOTICE 'User % had % excess devices deactivated', v_user.user_id, v_count;
  END LOOP;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION public.enforce_max_devices_per_user() IS 
  'Automatically deactivates the oldest device when a user registers more than 2 devices. This ensures each user can only have 2 active push notification subscriptions.';

COMMENT ON VIEW public.user_device_summary IS 
  'Admin view showing device usage summary per user, including active device count and details.';

-- ============================================
-- Update: Use device_subscriptions for push targeting
-- ============================================
-- The instant_notification_router trigger should now look at device_subscriptions
-- instead of profiles.device_token for push users

-- Create helper function to get push-enabled users (users with at least 1 active device)
CREATE OR REPLACE FUNCTION public.get_push_enabled_users()
RETURNS TABLE (user_id UUID, display_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT 
    ds.user_id,
    COALESCE(NULLIF(trim(p.display_name), ''), NULLIF(trim(p.real_name), ''), 'User') AS display_name
  FROM device_subscriptions ds
  JOIN profiles p ON p.id = ds.user_id
  WHERE ds.is_active = true
    AND ds.onesignal_player_id IS NOT NULL
    AND p.account_status = 'active'
    AND COALESCE(p.xeon_stream_subscription, false) = true;
END;
$$;

COMMENT ON FUNCTION public.get_push_enabled_users() IS 
  'Returns users who have at least one active device with a valid OneSignal Player ID. Used by notification triggers to determine push recipients.';

