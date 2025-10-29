-- ============================================================================
-- PRE-DEPLOYMENT VERIFICATION & BASELINE MEASUREMENTS
-- ============================================================================
-- Run this script BEFORE deploying the fixes
-- Save the output for comparison after deployment
-- ============================================================================

\echo '============================================================================'
\echo 'PRE-DEPLOYMENT VERIFICATION CHECKLIST'
\echo '============================================================================'
\echo ''

-- ============================================================================
-- CHECK 1: Verify signal_subscriptions table exists
-- ============================================================================

\echo '📋 CHECK 1: signal_subscriptions table'
\echo 'Expected: 8 rows showing all columns'
\echo 'If 0 rows: STOP and create table first (from previous migration)'
\echo ''

SELECT 
  table_name, 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'signal_subscriptions'
ORDER BY ordinal_position;

\echo ''
\echo '============================================================================'

-- ============================================================================
-- CHECK 2: Verify current trigger exists
-- ============================================================================

\echo '📋 CHECK 2: Database triggers'
\echo 'Expected: enhanced_notification_pipeline_v2_trigger enabled'
\echo ''

SELECT 
  tgname as trigger_name,
  CASE tgenabled 
    WHEN 'O' THEN 'enabled'
    WHEN 'D' THEN 'disabled'
    ELSE 'unknown'
  END as status
FROM pg_trigger
WHERE tgrelid = 'trade_alerts'::regclass
  AND tgname LIKE '%notification%';

\echo ''
\echo '============================================================================'

-- ============================================================================
-- CHECK 3: Measure current deadlock rate (BASELINE)
-- ============================================================================

\echo '📊 BASELINE 3: Current deadlock rate'
\echo 'Save this number for comparison!'
\echo ''

SELECT 
  datname as database,
  confl_deadlock as total_deadlocks
FROM pg_stat_database_conflicts
WHERE datname = current_database();

\echo ''
\echo '============================================================================'

-- ============================================================================
-- CHECK 4: Measure current signal insert performance (BASELINE)
-- ============================================================================

\echo '📊 BASELINE 4: Signal insert performance (last hour)'
\echo 'Save these numbers for comparison!'
\echo ''

SELECT 
  COUNT(*) as signals_created,
  ROUND(AVG(EXTRACT(EPOCH FROM (updated_at - created_at)))::numeric, 2) as avg_insert_time_seconds,
  ROUND(MAX(EXTRACT(EPOCH FROM (updated_at - created_at)))::numeric, 2) as max_insert_time_seconds,
  ROUND(MIN(EXTRACT(EPOCH FROM (updated_at - created_at)))::numeric, 2) as min_insert_time_seconds
FROM trade_alerts
WHERE created_at > NOW() - INTERVAL '1 hour';

\echo ''
\echo '============================================================================'

-- ============================================================================
-- CHECK 5: Check for existing alert processing functions
-- ============================================================================

\echo '📋 CHECK 5: Alert processing functions'
\echo 'Expected: process_price_alerts_enhanced_v2 (the old one we are replacing)'
\echo ''

SELECT 
  proname as function_name,
  pronargs as num_args,
  pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc
WHERE proname LIKE '%process_price_alerts%'
ORDER BY proname;

\echo ''
\echo '============================================================================'

-- ============================================================================
-- CHECK 6: Current database lock status
-- ============================================================================

\echo '📊 BASELINE 6: Current lock status'
\echo 'Ideally should be 0 locks on trade_alerts'
\echo ''

SELECT 
  pid,
  usename,
  wait_event_type,
  wait_event,
  state,
  EXTRACT(EPOCH FROM (now() - query_start))::integer as query_duration_seconds
FROM pg_stat_activity
WHERE 
  wait_event_type = 'Lock'
  AND query LIKE '%trade_alerts%'
  AND state != 'idle';

\echo ''
\echo '============================================================================'

-- ============================================================================
-- CHECK 7: Recent edge function errors
-- ============================================================================

\echo '📋 CHECK 7: Recent edge function errors (price-ingestor)'
\echo 'Look for deadlock errors or timeout errors'
\echo ''

-- Note: This requires edge function logging to be available
-- Adjust table name if your edge function logs are stored differently
\echo 'Check your edge function logs manually for:'
\echo '  - "deadlock detected" errors'
\echo '  - "canceling statement due to statement timeout" errors'
\echo '  - High frequency of alert processing (every 500ms)'

\echo ''
\echo '============================================================================'

-- ============================================================================
-- SAVE BASELINE SUMMARY
-- ============================================================================

\echo '📊 BASELINE SUMMARY - Save these values!'
\echo ''

CREATE TEMP TABLE baseline_measurements AS
SELECT 
  NOW() as measurement_time,
  'BEFORE_FIX' as stage,
  (SELECT COUNT(*) FROM trade_alerts WHERE created_at > NOW() - INTERVAL '1 hour') as signals_last_hour,
  (SELECT ROUND(AVG(EXTRACT(EPOCH FROM (updated_at - created_at)))::numeric, 2) 
   FROM trade_alerts WHERE created_at > NOW() - INTERVAL '1 hour') as avg_insert_time,
  (SELECT confl_deadlock FROM pg_stat_database_conflicts WHERE datname = current_database()) as total_deadlocks,
  (SELECT COUNT(*) FROM pg_stat_activity 
   WHERE wait_event_type = 'Lock' AND query LIKE '%trade_alerts%' AND state != 'idle') as current_locks;

SELECT 
  stage,
  measurement_time,
  signals_last_hour,
  avg_insert_time as avg_insert_seconds,
  total_deadlocks,
  current_locks
FROM baseline_measurements;

\echo ''
\echo '============================================================================'
\echo '✅ PRE-DEPLOYMENT VERIFICATION COMPLETE'
\echo '============================================================================'
\echo ''
\echo 'Next steps:'
\echo '1. Save the output of this script'
\echo '2. If signal_subscriptions table missing, create it first'
\echo '3. Deploy the migration: 20251029070000_fix_alert_processing_deadlocks.sql'
\echo '4. Deploy updated price-ingestor function'
\echo '5. Deploy updated ModernNotificationSystem.tsx'
\echo '6. Run post-deployment verification script'
\echo ''
\echo '============================================================================'
