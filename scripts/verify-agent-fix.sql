-- Verification Script for Agent Outputs Table Restoration
-- Run this script after applying the migration to verify everything works

-- ============================================
-- STEP 1: Verify Table Exists
-- ============================================
SELECT 'Checking if agent_outputs table exists...' as step;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'agent_outputs'
    ) 
    THEN '✅ agent_outputs table EXISTS'
    ELSE '❌ agent_outputs table MISSING'
  END as result;

-- ============================================
-- STEP 2: Verify Table Schema
-- ============================================
SELECT 'Checking table schema...' as step;

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'agent_outputs'
ORDER BY ordinal_position;

-- Expected columns:
-- id (uuid)
-- user_id (uuid)
-- agent_name (text)
-- output_text (text)
-- user_readable_text (text)
-- metadata (jsonb)
-- created_at (timestamp with time zone)
-- updated_at (timestamp with time zone)

-- ============================================
-- STEP 3: Verify Indexes
-- ============================================
SELECT 'Checking indexes...' as step;

SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'agent_outputs'
ORDER BY indexname;

-- Expected indexes:
-- agent_outputs_pkey (primary key on id)
-- idx_agent_outputs_user_id
-- idx_agent_outputs_agent_name
-- idx_agent_outputs_created_at

-- ============================================
-- STEP 4: Verify RLS Policies
-- ============================================
SELECT 'Checking RLS policies...' as step;

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'agent_outputs';

-- Expected: "Users can manage their own agent outputs" policy

-- ============================================
-- STEP 5: Check for Existing Data
-- ============================================
SELECT 'Checking existing data...' as step;

SELECT 
  COUNT(*) as total_records,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT agent_name) as unique_agents,
  MIN(created_at) as oldest_record,
  MAX(created_at) as newest_record
FROM agent_outputs;

-- ============================================
-- STEP 6: Check Data by Agent Type
-- ============================================
SELECT 'Records by agent type...' as step;

SELECT 
  agent_name,
  COUNT(*) as record_count,
  MAX(created_at) as last_output
FROM agent_outputs
GROUP BY agent_name
ORDER BY record_count DESC;

-- ============================================
-- STEP 7: Recent Activity Check
-- ============================================
SELECT 'Recent agent activity (last 7 days)...' as step;

SELECT 
  DATE(created_at) as date,
  agent_name,
  COUNT(*) as outputs_created
FROM agent_outputs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at), agent_name
ORDER BY date DESC, agent_name;

-- ============================================
-- STEP 8: Verify Triggers
-- ============================================
SELECT 'Checking triggers...' as step;

SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'agent_outputs';

-- Expected: update_agent_outputs_updated_at trigger

-- ============================================
-- STEP 9: Check Related Tables Status
-- ============================================
SELECT 'Verifying related tables exist...' as step;

SELECT 
  table_name,
  CASE 
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t.table_name)
    THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM (
  VALUES 
    ('user_trading_profiles'),
    ('screenshot_analysis_history'),
    ('user_personalization_preferences'),
    ('trade_journal_entries')
) AS t(table_name);

-- ============================================
-- STEP 10: Test Insert (Optional - Comment out if you don't want to create test data)
-- ============================================
/*
SELECT 'Testing insert capability...' as step;

-- This will only work if you're authenticated as a user
INSERT INTO agent_outputs (user_id, agent_name, output_text, user_readable_text, metadata)
VALUES (
  auth.uid(),
  'TestAgent',
  'This is a test output from verification script',
  'Test verification successful!',
  '{"test": true, "timestamp": "' || NOW()::text || '"}'::jsonb
)
RETURNING id, agent_name, created_at;

-- Clean up test data
DELETE FROM agent_outputs WHERE agent_name = 'TestAgent';
*/

-- ============================================
-- FINAL SUMMARY
-- ============================================
SELECT '
╔══════════════════════════════════════════════════════════════╗
║                   VERIFICATION COMPLETE                       ║
╠══════════════════════════════════════════════════════════════╣
║  Check the results above for any ❌ MISSING or errors       ║
║                                                              ║
║  If all steps show ✅ or return expected data:              ║
║    → Migration was successful                               ║
║    → Agent outputs table is restored                        ║
║    → Agents can now store outputs                          ║
║                                                              ║
║  Next Steps:                                                ║
║    1. Test Coach Agent by logging a trade                  ║
║    2. Test Deconstructor Agent by uploading screenshots    ║
║    3. Monitor edge function logs for errors                ║
║    4. Check user experience in the app                     ║
╚══════════════════════════════════════════════════════════════╝
' as summary;
