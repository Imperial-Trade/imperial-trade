-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 🗑️ REMOVE DUPLICATE NOTIFICATION SYSTEM
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Migration: 20251112_remove_duplicate_notification_system
-- Date: November 12, 2025
-- 
-- PROBLEM:
-- Two duplicate trigger systems were running simultaneously on the 
-- trade_alerts table, causing duplicate notifications:
--
-- 1. OLD SYSTEM: trade_alert_notification_trigger 
--    → enhanced_notification_pipeline_v2()
--    → enhanced-signal-notification-dispatcher Edge Function
--
-- 2. NEW SYSTEM: instant_notification_trigger
--    → instant_notification_router()
--    → notify-signal-created, notify-tp1-hit, etc. Edge Functions
--
-- SOLUTION:
-- Remove the old system and keep only the new instant notification system.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Step 1: Drop the old trigger
DROP TRIGGER IF EXISTS trade_alert_notification_trigger ON public.trade_alerts;

-- Step 2: Drop the old function
DROP FUNCTION IF EXISTS public.enhanced_notification_pipeline_v2();

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ✅ VERIFICATION
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- After this migration, only these triggers should exist on trade_alerts:
--
-- BEFORE triggers:
-- - prevent_empty_booleans_trade_alerts (INSERT/UPDATE)
-- - sanitize_boolean_fields_before_update (UPDATE)
-- - set_activation_timestamp_trigger (UPDATE)
-- - smart_updated_at_trigger (UPDATE)
--
-- AFTER triggers:
-- - create_alert_monitoring_trigger (INSERT)
-- - instant_notification_trigger (INSERT/UPDATE) ← NEW SYSTEM ONLY
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Verification query (for manual check):
-- SELECT trigger_name, event_manipulation, action_statement
-- FROM information_schema.triggers 
-- WHERE event_object_table = 'trade_alerts'
-- ORDER BY trigger_name;
