-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 🔍 VERIFICATION SCRIPT: Check if notes field is in trigger
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Run this in Supabase SQL Editor to verify the trigger includes notes
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Step 1: Check if trigger exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'instant_notification_trigger'
  ) THEN
    RAISE NOTICE '✅ Trigger EXISTS: instant_notification_trigger';
  ELSE
    RAISE NOTICE '❌ Trigger MISSING: instant_notification_trigger';
  END IF;
END $$;

-- Step 2: Check if function exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'instant_notification_router'
  ) THEN
    RAISE NOTICE '✅ Function EXISTS: instant_notification_router';
  ELSE
    RAISE NOTICE '❌ Function MISSING: instant_notification_router';
  END IF;
END $$;

-- Step 3: Get function details
SELECT 
  proname as function_name,
  pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE proname = 'instant_notification_router';

-- Step 4: Count occurrences of 'notes', NEW.notes in function
DO $$
DECLARE
  function_body TEXT;
  notes_count INT;
BEGIN
  SELECT pg_get_functiondef(oid) INTO function_body
  FROM pg_proc 
  WHERE proname = 'instant_notification_router';
  
  IF function_body IS NULL THEN
    RAISE NOTICE '❌ Could not retrieve function body';
  ELSE
    -- Count how many times 'notes', NEW.notes appears
    notes_count := array_length(
      regexp_matches(function_body, '''notes'',\s*NEW\.notes', 'g'),
      1
    );
    
    IF notes_count IS NULL THEN
      notes_count := 0;
    END IF;
    
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '📊 VERIFICATION RESULTS:';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE 'Found ''notes'', NEW.notes: % times', notes_count;
    RAISE NOTICE '';
    
    IF notes_count >= 5 THEN
      RAISE NOTICE '✅ PASS: Notes field is included in trigger!';
      RAISE NOTICE 'Expected: 5-6 occurrences (one per notification type)';
      RAISE NOTICE 'Found: % occurrences', notes_count;
    ELSE
      RAISE NOTICE '❌ FAIL: Notes field is MISSING from trigger!';
      RAISE NOTICE 'Expected: 5-6 occurrences';
      RAISE NOTICE 'Found: % occurrences', notes_count;
      RAISE NOTICE '';
      RAISE NOTICE '🔧 ACTION REQUIRED:';
      RAISE NOTICE 'Apply migration: 20251115003132_ab410826-0dc1-4350-a58a-11af45af2b19.sql';
    END IF;
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  END IF;
END $$;

-- Step 5: Check recent migration logs
SELECT 
  job_name,
  execution_time,
  status,
  error_message
FROM public.cron_job_logs 
WHERE job_name LIKE '%notification%' 
ORDER BY execution_time DESC 
LIMIT 5;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 📋 INSTRUCTIONS:
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 1. Copy this entire script
-- 2. Go to Supabase Dashboard → SQL Editor
-- 3. Paste and run
-- 4. Check the NOTICES section for results
-- 5. Share the output with me if you need help
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

