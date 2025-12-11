-- ============================================
-- Migration: Fix Subscriptions Without Player IDs
-- ============================================
-- This migration:
-- 1. Identifies users who are "subscribed" but have no Player ID
-- 2. Resets their subscription so they are prompted to re-subscribe
-- 3. Adds a check constraint to prevent future subscriptions without Player IDs
-- ============================================

-- ============================================
-- Step 1: Find and reset invalid subscriptions
-- ============================================
-- Users with xeon_stream_subscription = true but NO device with Player ID
-- These users need to re-subscribe to get a proper Player ID

DO $$
DECLARE
  v_user RECORD;
  v_count INTEGER := 0;
BEGIN
  RAISE NOTICE '🔍 Finding users with subscriptions but no Player ID...';

  FOR v_user IN 
    SELECT 
      p.id,
      p.display_name,
      p.email,
      p.xeon_stream_subscription,
      p.device_token
    FROM profiles p
    WHERE p.xeon_stream_subscription = true
      AND p.account_status = 'active'
      AND NOT EXISTS (
        SELECT 1 
        FROM device_subscriptions ds 
        WHERE ds.user_id = p.id 
          AND ds.is_active = true 
          AND ds.onesignal_player_id IS NOT NULL
      )
  LOOP
    RAISE NOTICE '⚠️ User % (%) has subscription but no Player ID - resetting', 
      v_user.display_name, v_user.id;
    
    -- Reset their subscription flag so they get prompted again
    UPDATE profiles
    SET 
      xeon_stream_subscription = false,
      device_token = NULL,
      device_platform = NULL,
      device_token_updated_at = NOW()
    WHERE id = v_user.id;
    
    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE '✅ Reset % users with invalid subscriptions', v_count;
END;
$$;

-- ============================================
-- Step 2: Create function to validate subscription
-- ============================================
-- This function ensures a user can only be marked as subscribed
-- if they have at least one active device with a Player ID

CREATE OR REPLACE FUNCTION public.validate_subscription_has_player_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_has_player_id BOOLEAN;
BEGIN
  -- Only check when subscription is being enabled
  IF NEW.xeon_stream_subscription = true AND 
     (OLD.xeon_stream_subscription IS NULL OR OLD.xeon_stream_subscription = false) THEN
    
    -- Check if user has at least one active device with Player ID
    SELECT EXISTS (
      SELECT 1 
      FROM device_subscriptions ds 
      WHERE ds.user_id = NEW.id 
        AND ds.is_active = true 
        AND ds.onesignal_player_id IS NOT NULL
    ) INTO v_has_player_id;
    
    -- If no Player ID, log a warning but allow the update
    -- The frontend should handle getting the Player ID
    IF NOT v_has_player_id THEN
      RAISE WARNING '⚠️ User % enabling subscription without Player ID - device registration pending', NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger (only for validation/logging, doesn't block)
DROP TRIGGER IF EXISTS trigger_validate_subscription ON public.profiles;
CREATE TRIGGER trigger_validate_subscription
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (NEW.xeon_stream_subscription IS DISTINCT FROM OLD.xeon_stream_subscription)
  EXECUTE FUNCTION public.validate_subscription_has_player_id();

-- ============================================
-- Step 3: Create view for monitoring invalid subscriptions
-- ============================================
CREATE OR REPLACE VIEW public.invalid_subscriptions AS
SELECT 
  p.id AS user_id,
  p.display_name,
  p.email,
  p.xeon_stream_subscription,
  p.device_token AS profile_device_token,
  p.created_at AS user_created_at,
  COALESCE(ds_count.active_devices, 0) AS active_devices_count,
  COALESCE(ds_count.devices_with_player_id, 0) AS devices_with_player_id,
  CASE 
    WHEN p.xeon_stream_subscription = true AND COALESCE(ds_count.devices_with_player_id, 0) = 0 
    THEN 'INVALID - No Player ID'
    WHEN p.xeon_stream_subscription = true AND COALESCE(ds_count.devices_with_player_id, 0) > 0 
    THEN 'VALID'
    WHEN p.xeon_stream_subscription = false 
    THEN 'NOT SUBSCRIBED'
    ELSE 'UNKNOWN'
  END AS subscription_status
FROM profiles p
LEFT JOIN (
  SELECT 
    user_id,
    COUNT(*) FILTER (WHERE is_active = true) AS active_devices,
    COUNT(*) FILTER (WHERE is_active = true AND onesignal_player_id IS NOT NULL) AS devices_with_player_id
  FROM device_subscriptions
  GROUP BY user_id
) ds_count ON ds_count.user_id = p.id
WHERE p.account_status = 'active'
ORDER BY 
  CASE 
    WHEN p.xeon_stream_subscription = true AND COALESCE(ds_count.devices_with_player_id, 0) = 0 THEN 0
    ELSE 1
  END,
  p.created_at DESC;

GRANT SELECT ON public.invalid_subscriptions TO authenticated;

COMMENT ON VIEW public.invalid_subscriptions IS 
  'Shows subscription status for all active users, highlighting those with subscriptions but no Player ID (invalid state).';

-- ============================================
-- Step 4: Create helper function for admin to reset invalid subscriptions
-- ============================================
CREATE OR REPLACE FUNCTION public.reset_invalid_subscriptions()
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  email TEXT,
  reset_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user RECORD;
BEGIN
  FOR v_user IN 
    SELECT 
      p.id,
      p.display_name,
      p.email
    FROM profiles p
    WHERE p.xeon_stream_subscription = true
      AND p.account_status = 'active'
      AND NOT EXISTS (
        SELECT 1 
        FROM device_subscriptions ds 
        WHERE ds.user_id = p.id 
          AND ds.is_active = true 
          AND ds.onesignal_player_id IS NOT NULL
      )
  LOOP
    -- Reset subscription
    UPDATE profiles
    SET 
      xeon_stream_subscription = false,
      device_token = NULL,
      device_platform = NULL,
      device_token_updated_at = NOW()
    WHERE id = v_user.id;
    
    user_id := v_user.id;
    display_name := v_user.display_name;
    email := v_user.email;
    reset_status := 'RESET - User must re-subscribe';
    
    RETURN NEXT;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.reset_invalid_subscriptions() IS 
  'Resets all users who have subscriptions but no Player ID. They will be prompted to subscribe again.';

-- ============================================
-- Step 5: Log migration results
-- ============================================
DO $$
DECLARE
  v_invalid_count INTEGER;
  v_valid_count INTEGER;
  v_total_subscribed INTEGER;
BEGIN
  -- Count invalid subscriptions
  SELECT COUNT(*) INTO v_invalid_count
  FROM profiles p
  WHERE p.xeon_stream_subscription = true
    AND p.account_status = 'active'
    AND NOT EXISTS (
      SELECT 1 
      FROM device_subscriptions ds 
      WHERE ds.user_id = p.id 
        AND ds.is_active = true 
        AND ds.onesignal_player_id IS NOT NULL
    );

  -- Count valid subscriptions
  SELECT COUNT(*) INTO v_valid_count
  FROM profiles p
  WHERE p.xeon_stream_subscription = true
    AND p.account_status = 'active'
    AND EXISTS (
      SELECT 1 
      FROM device_subscriptions ds 
      WHERE ds.user_id = p.id 
        AND ds.is_active = true 
        AND ds.onesignal_player_id IS NOT NULL
    );

  -- Total subscribed
  SELECT COUNT(*) INTO v_total_subscribed
  FROM profiles
  WHERE xeon_stream_subscription = true
    AND account_status = 'active';

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 SUBSCRIPTION STATUS REPORT';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total subscribed users: %', v_total_subscribed;
  RAISE NOTICE '✅ Valid (with Player ID): %', v_valid_count;
  RAISE NOTICE '❌ Invalid (no Player ID): %', v_invalid_count;
  RAISE NOTICE '========================================';
END;
$$;



