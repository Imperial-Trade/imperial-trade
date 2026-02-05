-- ============================================================================
-- 🔍 VERIFY NOTES ARE WORKING - RUN THIS AFTER APPLYING THE MIGRATION
-- ============================================================================
-- This script will verify that notes are properly included in notifications
--
-- HOW TO USE:
-- 1. First, apply RUN_THIS_IN_SUPABASE.sql
-- 2. Then run this script to verify
-- 3. Finally, create a test signal with notes and check Recent Activity
-- ============================================================================

-- Step 1: Verify the function exists and was updated recently
SELECT 
  proname as function_name,
  pg_catalog.pg_get_userbyid(proowner) as owner,
  prosecdef as is_security_definer,
  to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS') as current_time,
  'Function exists' as status
FROM pg_proc
WHERE proname = 'instant_notification_router';

-- Step 2: Check if trigger is attached to trade_alerts table
SELECT 
  trigger_name,
  event_manipulation as trigger_event,
  action_timing as when_fires,
  'Trigger is active' as status
FROM information_schema.triggers
WHERE event_object_table = 'trade_alerts'
  AND trigger_name = 'instant_notification_trigger';

-- Step 3: Get the function definition to verify 'notes' field is present
-- (This will show a snippet of the function)
SELECT 
  CASE 
    WHEN pg_get_functiondef(oid) LIKE '%''notes'', NEW.notes%' 
    THEN '✅ Notes field IS included in function'
    ELSE '❌ Notes field is NOT included in function'
  END as notes_verification
FROM pg_proc
WHERE proname = 'instant_notification_router';

-- Step 4: Count how many times 'notes', NEW.notes appears in the function
-- (Should be 5 times - one for each notification type except notes_updated which already had it)
SELECT 
  (LENGTH(pg_get_functiondef(oid)) - LENGTH(REPLACE(pg_get_functiondef(oid), '''notes'', NEW.notes', ''))) 
  / LENGTH('''notes'', NEW.notes') as notes_field_count,
  CASE 
    WHEN (LENGTH(pg_get_functiondef(oid)) - LENGTH(REPLACE(pg_get_functiondef(oid), '''notes'', NEW.notes', ''))) 
         / LENGTH('''notes'', NEW.notes') >= 5
    THEN '✅ Notes field appears 5+ times (CORRECT)'
    ELSE '❌ Notes field appears less than 5 times (NEEDS FIX)'
  END as verification_status
FROM pg_proc
WHERE proname = 'instant_notification_router';

-- Step 5: Check recent signals with notes
SELECT 
  id,
  asset_name,
  trade_type,
  entry_price,
  CASE 
    WHEN notes IS NOT NULL AND notes != '' 
    THEN '✅ Has notes: ' || LEFT(notes, 30) || '...'
    ELSE '❌ No notes'
  END as notes_status,
  created_at
FROM trade_alerts
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 10;

-- Step 6: Summary message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '🔍 VERIFICATION COMPLETE';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Check the results above:';
  RAISE NOTICE '1. Function should exist';
  RAISE NOTICE '2. Trigger should be active';
  RAISE NOTICE '3. Notes verification should show ✅';
  RAISE NOTICE '4. Notes field count should be 5+';
  RAISE NOTICE '5. Recent signals should show notes status';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 TESTING STEPS:';
  RAISE NOTICE '1. Create a new signal with notes: "test notes display"';
  RAISE NOTICE '2. Wait a few seconds';
  RAISE NOTICE '3. Open Recent Activity panel (bell icon)';
  RAISE NOTICE '4. Check if notes appear below main message';
  RAISE NOTICE '5. Notes should be styled: gray, uppercase, 10px';
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
END $$;

