-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 🗑️ REMOVE DUPLICATE NOTIFICATION SYSTEM
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- This will eliminate duplicate notifications by removing the old
-- enhanced-signal-notification-dispatcher system.
-- The new instant_notification_router system will remain active.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Step 1: Drop the old trigger (if it exists)
DROP TRIGGER IF EXISTS trade_alert_notification_trigger ON public.trade_alerts;
DROP TRIGGER IF EXISTS enhanced_signal_notification_pipeline_insert ON public.trade_alerts;
DROP TRIGGER IF EXISTS enhanced_signal_notification_pipeline_update ON public.trade_alerts;

-- Step 2: Drop the old function (if it exists)
DROP FUNCTION IF EXISTS public.enhanced_notification_pipeline();
DROP FUNCTION IF EXISTS public.enhanced_notification_pipeline_v2();

-- Step 3: Verify only the new system remains
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'trade_alerts'
  AND trigger_name LIKE '%notification%'
ORDER BY trigger_name;

-- Expected result: Only 'instant_notification_trigger' should remain
