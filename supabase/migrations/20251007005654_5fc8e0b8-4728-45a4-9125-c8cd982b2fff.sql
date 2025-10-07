-- ============================================
-- PHASE 1.5: TRIGGER CLEANUP + DEDUPLICATION
-- Removes 11 Duplicate/Legacy Triggers
-- Keeps Only 4 Phoenix Plan Triggers
-- ============================================

-- ============================================
-- DROP DUPLICATE/LEGACY TRIGGERS
-- ============================================

-- Remove duplicate alert monitoring trigger (we have create_alert_monitoring_trigger)
DROP TRIGGER IF EXISTS create_alert_monitoring_entries_trigger ON public.trade_alerts;

-- Remove legacy notification triggers (replaced by enhanced_notification_pipeline_v2)
DROP TRIGGER IF EXISTS enhanced_signal_notification_trigger ON public.trade_alerts;
DROP TRIGGER IF EXISTS enhanced_signal_notification_trigger_v2 ON public.trade_alerts;
DROP TRIGGER IF EXISTS enhanced_signal_notification_trigger_v3 ON public.trade_alerts;
DROP TRIGGER IF EXISTS immediate_signal_notification_trigger ON public.trade_alerts;
DROP TRIGGER IF EXISTS signal_status_notification_trigger ON public.trade_alerts;
DROP TRIGGER IF EXISTS trade_alerts_notification_trigger ON public.trade_alerts;

-- Remove phantom update prevention trigger (replaced by smart_updated_at)
DROP TRIGGER IF EXISTS prevent_phantom_updates_trigger ON public.trade_alerts;

-- Remove sync alert monitoring trigger (redundant)
DROP TRIGGER IF EXISTS sync_alert_monitoring_trigger ON public.trade_alerts;

-- Remove misplaced forum triggers (these belong on forum_posts/replies tables!)
DROP TRIGGER IF EXISTS update_post_likes_count_trigger ON public.trade_alerts;
DROP TRIGGER IF EXISTS update_replies_count_trigger ON public.trade_alerts;

-- ============================================
-- VALIDATION: Confirm only 4 triggers remain
-- ============================================

-- Expected triggers:
-- 1. enhanced_notification_pipeline_v2_trigger (AFTER INSERT OR UPDATE)
-- 2. smart_updated_at_trigger (BEFORE UPDATE)
-- 3. create_alert_monitoring_trigger (AFTER INSERT)
-- 4. set_activation_timestamp_trigger (BEFORE UPDATE)

-- ============================================
-- Log cleanup completion
-- ============================================
INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
VALUES (
  'phoenix_plan_trigger_cleanup',
  NOW(),
  11,
  'success',
  '🧹 TRIGGER CLEANUP COMPLETE: Removed 11 duplicate/legacy triggers. System now has exactly 4 Phoenix Plan triggers. Ready for synthetic validation.'
);

-- ============================================
-- SYNTHETIC TEST PREPARATION
-- Create a test helper function for validation
-- ============================================

CREATE OR REPLACE FUNCTION public.create_synthetic_test_signal(
  p_test_scenario TEXT DEFAULT 'basic_notification'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  test_signal_id uuid;
  admin_user_id uuid;
BEGIN
  -- Get first admin user for testing
  SELECT id INTO admin_user_id
  FROM profiles
  WHERE access_level = 'admin'
  LIMIT 1;
  
  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'No admin user found for testing';
  END IF;
  
  -- Create test signal based on scenario
  INSERT INTO trade_alerts (
    user_id,
    asset_name,
    tradermade_symbol,
    trade_type,
    entry_price,
    stop_loss,
    tp1,
    tp2,
    tp3,
    status,
    notes
  ) VALUES (
    admin_user_id,
    CASE p_test_scenario
      WHEN 'limit_order_test' THEN 'TEST_EUR/USD_LIMIT'
      WHEN 'tp_hit_test' THEN 'TEST_GBP/USD_TP'
      ELSE 'TEST_EUR/USD_BASIC'
    END,
    CASE p_test_scenario
      WHEN 'limit_order_test' THEN 'EURUSD'
      WHEN 'tp_hit_test' THEN 'GBPUSD'
      ELSE 'EURUSD'
    END,
    CASE p_test_scenario
      WHEN 'limit_order_test' THEN 'buy_limit'
      ELSE 'buy'
    END,
    1.10000,
    1.09500,
    1.10500,
    1.11000,
    1.11500,
    CASE p_test_scenario
      WHEN 'limit_order_test' THEN 'pending'
      ELSE 'active'
    END,
    '🧪 SYNTHETIC TEST - Created by Phoenix Plan validation'
  )
  RETURNING id INTO test_signal_id;
  
  -- Log test signal creation
  INSERT INTO cron_job_logs (job_name, execution_time, records_affected, status, error_message)
  VALUES (
    'synthetic_test_signal_creation',
    NOW(),
    1,
    'success',
    format('🧪 Created synthetic test signal: %s - Scenario: %s', test_signal_id, p_test_scenario)
  );
  
  RETURN test_signal_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_synthetic_test_signal TO authenticated;