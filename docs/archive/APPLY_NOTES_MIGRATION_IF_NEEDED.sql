-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 🔧 EMERGENCY FIX: Apply Notes to All Notification Payloads
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ⚠️ ONLY RUN THIS IF VERIFY_TRIGGER_HAS_NOTES.sql shows FAIL
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Check if this migration was already applied
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM cron_job_logs 
    WHERE job_name = 'add_notes_to_all_notification_payloads'
    AND status = 'success'
  ) THEN
    RAISE NOTICE '✅ Migration already applied! Skipping...';
    RAISE NOTICE 'If notes still not working, check Edge Function logs.';
    RETURN;
  END IF;
  
  RAISE NOTICE '⚠️ Migration not found. Proceeding with application...';
END $$;

-- Apply the migration from file: 20251115003132_ab410826-0dc1-4350-a58a-11af45af2b19.sql
-- Copy the ENTIRE contents of that file here and run it.

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 📋 INSTRUCTIONS:
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Option 1: Via Supabase CLI (Recommended)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Run in your terminal:
--   cd "C:\Users\Jacob Estayo\Trade imperial\imperial-trade"
--   supabase db push
--
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Option 2: Via Supabase Dashboard (Manual)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 1. Open: supabase/migrations/20251115003132_ab410826-0dc1-4350-a58a-11af45af2b19.sql
-- 2. Copy ALL contents (entire file)
-- 3. Go to Supabase Dashboard → SQL Editor
-- 4. Paste and run
-- 5. Check for success message
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

