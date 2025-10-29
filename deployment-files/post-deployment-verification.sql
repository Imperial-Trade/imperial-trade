-- ============================================================================
-- POST-DEPLOYMENT VERIFICATION & PERFORMANCE COMPARISON
-- ============================================================================
-- Run this script AFTER deploying all fixes
-- Compare results with pre-deployment baseline
-- ============================================================================

\echo '============================================================================'
\echo 'POST-DEPLOYMENT VERIFICATION'
\echo '============================================================================'
\echo ''

-- ============================================================================
-- VERIFY 1: New function exists
-- ============================================================================

\echo '✅ VERIFY 1: process_price_alerts_batch_v3 function'
\echo 'Expected: Should exist with 2 arguments'
\echo ''

SELECT 
  proname as function_name,
  pronargs as num_args,
  pg_get_function_identity_arguments(oid) as arguments,
  CASE 
    WHEN proname = 'process_price_alerts_batch_v3' THEN '✅ CREATED'
    ELSE '❌ NOT FOUND'
  END as status
FROM pg_proc
WHERE proname = 'process_price_alerts_batch_v3';

\echo ''
\echo '============================================================================'

-- ============================================================================
-- VERIFY 2: Indexes created
-- ============================================================================

\echo '✅ VERIFY 2: Performance indexes'
\echo 'Expected: All 4 indexes should exist'
\echo 'Note: CONCURRENTLY indexes may still be building'
\echo ''

SELECT 
  indexname,
  tablename,
  CASE 
    WHEN pg_index.indisvalid THEN '✅ READY'
    ELSE '⏳ BUILDING'
  END as status
FROM pg_indexes
JOIN pg_class ON pg_indexes.indexname = pg_class.relname
JOIN pg_index ON pg_class.oid = pg_index.indexrelid
WHERE indexname IN (
  'idx_alert_monitoring_active_symbol',
  'idx_trade_alerts_status_symbol',
  'idx_trade_alerts_user_status',
  'idx_alert_monitoring_signal_active'
)
ORDER BY indexname;

\echo ''
\echo '============================================================================'

-- ============================================================================
-- VERIFY 3: Cooldown table created
-- ============================================================================

\echo '✅ VERIFY 3: alert_processing_cooldowns table'
\echo 'Expected: Table exists with 0+ rows'
\echo ''

SELECT 
  COUNT(*) as cooldown_records,
  MAX(last_processed_at) as most_recent_processing
FROM alert_processing_cooldowns;

\echo ''
\echo '============================================================================'

-- ============================================================================
-- VERIFY 4: Monitoring view works
-- ============================================================================

\echo '✅ VERIFY 4: alert_processing_stats view'
\echo 'Expected: View returns data without errors'
\echo ''

SELECT 
  symbol,
  processing_count,
  ROUND(seconds_since_last_process::numeric, 1) as seconds_since_last,
  active_alerts
FROM alert_processing_stats
ORDER BY last_processed_at DESC
LIMIT 5;

\echo ''
\echo '============================================================================'

-- ============================================================================
-- PERFORMANCE 1: Current deadlock rate (compare to baseline)
-- ============================================================================

\echo '📊 PERFORMANCE 1: Deadlock rate (compare to baseline)'
\echo 'Expected: Should be same or slightly higher (deadlocks are cumulative)'
\echo 'Monitor for next hour - should NOT increase significantly'
\echo ''

SELECT 
  datname as database,
  confl_deadlock as total_deadlocks,
  CASE 
    WHEN confl_deadlock = 0 THEN '🎯 PERFECT'
    WHEN confl_deadlock < 10 THEN '✅ ACCEPTABLE'
    WHEN confl_deadlock < 50 THEN '⚠️ MONITOR'
    ELSE '❌ ISSUE'
  END as status
FROM pg_stat_database_conflicts
WHERE datname = current_database();

\echo ''
\echo '============================================================================'

-- ============================================================================
-- PERFORMANCE 2: Signal insert performance (compare to baseline)
-- ============================================================================

\echo '📊 PERFORMANCE 2: Signal insert performance (last hour)'
\echo 'Expected: avg_insert_time < 0.2 seconds (should be much better than baseline)'
\echo ''

SELECT 
  COUNT(*) as signals_created,
  ROUND(AVG(EXTRACT(EPOCH FROM (updated_at - created_at)))::numeric, 3) as avg_insert_time_seconds,
  ROUND(MAX(EXTRACT(EPOCH FROM (updated_at - created_at)))::numeric, 3) as max_insert_time_seconds,
  ROUND(MIN(EXTRACT(EPOCH FROM (updated_at - created_at)))::numeric, 3) as min_insert_time_seconds,
  CASE 
    WHEN AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) < 0.2 THEN '🎯 EXCELLENT'
    WHEN AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) < 1.0 THEN '✅ GOOD'
    WHEN AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) < 5.0 THEN '⚠️ SLOW'
    ELSE '❌ ISSUE'
  END as performance_rating
FROM trade_alerts
WHERE created_at > NOW() - INTERVAL '1 hour';

\echo ''
\echo '============================================================================'

-- ============================================================================
-- PERFORMANCE 3: Current lock status
-- ============================================================================

\echo '📊 PERFORMANCE 3: Current database locks'
\echo 'Expected: 0 locks on trade_alerts'
\echo ''

SELECT 
  COUNT(*) as lock_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '🎯 PERFECT - No locks'
    WHEN COUNT(*) < 3 THEN '✅ ACCEPTABLE - Few locks'
    ELSE '⚠️ INVESTIGATE - Many locks'
  END as status
FROM pg_stat_activity
WHERE 
  wait_event_type = 'Lock'
  AND query LIKE '%trade_alerts%'
  AND state != 'idle';

-- Show details if any locks exist
SELECT 
  pid,
  usename,
  wait_event,
  state,
  EXTRACT(EPOCH FROM (now() - query_start))::integer as query_duration_seconds,
  LEFT(query, 80) as query_preview
FROM pg_stat_activity
WHERE 
  wait_event_type = 'Lock'
  AND query LIKE '%trade_alerts%'
  AND state != 'idle';

\echo ''
\echo '============================================================================'

-- ============================================================================
-- PERFORMANCE 4: Alert processing cooldown effectiveness
-- ============================================================================

\echo '📊 PERFORMANCE 4: Alert processing cooldown effectiveness'
\echo 'Expected: See 2+ second gaps between processing for each symbol'
\echo ''

SELECT 
  symbol,
  processing_count,
  ROUND(seconds_since_last_process::numeric, 1) as seconds_since_last,
  active_alerts,
  CASE 
    WHEN seconds_since_last_process >= 2 THEN '✅ COOLDOWN WORKING'
    WHEN seconds_since_last_process >= 1 THEN '⚠️ TOO FREQUENT'
    ELSE '❌ ISSUE - No cooldown'
  END as cooldown_status
FROM alert_processing_stats
ORDER BY last_processed_at DESC
LIMIT 10;

\echo ''
\echo '============================================================================'

-- ============================================================================
-- PERFORMANCE COMPARISON SUMMARY
-- ============================================================================

\echo '📊 PERFORMANCE COMPARISON SUMMARY'
\echo ''

CREATE TEMP TABLE post_deployment_measurements AS
SELECT 
  NOW() as measurement_time,
  'AFTER_FIX' as stage,
  (SELECT COUNT(*) FROM trade_alerts WHERE created_at > NOW() - INTERVAL '1 hour') as signals_last_hour,
  (SELECT ROUND(AVG(EXTRACT(EPOCH FROM (updated_at - created_at)))::numeric, 3) 
   FROM trade_alerts WHERE created_at > NOW() - INTERVAL '1 hour') as avg_insert_time,
  (SELECT confl_deadlock FROM pg_stat_database_conflicts WHERE datname = current_database()) as total_deadlocks,
  (SELECT COUNT(*) FROM pg_stat_activity 
   WHERE wait_event_type = 'Lock' AND query LIKE '%trade_alerts%' AND state != 'idle') as current_locks;

-- Display comparison (if you saved baseline in a permanent table)
\echo 'Compare these AFTER_FIX values to your saved BEFORE_FIX baseline:'
\echo ''

SELECT 
  stage,
  measurement_time,
  signals_last_hour,
  avg_insert_time as avg_insert_seconds,
  total_deadlocks,
  current_locks
FROM post_deployment_measurements;

\echo ''
\echo '============================================================================'

-- ============================================================================
-- TEST NEW FUNCTION DIRECTLY
-- ============================================================================

\echo '🧪 TEST: Direct function call'
\echo 'Testing process_price_alerts_batch_v3 with sample data'
\echo ''

-- Test with sample price data
SELECT 
  COUNT(*) as alerts_returned,
  COUNT(*) FILTER (WHERE triggered = true) as alerts_triggered
FROM process_price_alerts_batch_v3(
  ARRAY['XAUUSD', 'BTCUSD']::text[],
  '{"XAUUSD": {"bid": 2745.23, "ask": 2745.45, "mid": 2745.34}, "BTCUSD": {"bid": 95123.45, "ask": 95125.67, "mid": 95124.56}}'::jsonb
);

\echo ''
\echo '============================================================================'
\echo '✅ POST-DEPLOYMENT VERIFICATION COMPLETE'
\echo '============================================================================'
\echo ''
\echo 'Expected results:'
\echo '  ✅ Function created: process_price_alerts_batch_v3'
\echo '  ✅ Indexes created: 4 indexes (may still be building)'
\echo '  ✅ Table created: alert_processing_cooldowns'
\echo '  ✅ View works: alert_processing_stats'
\echo '  ✅ Deadlocks: Same or slightly higher (monitor for next hour)'
\echo '  ✅ Insert time: < 0.2 seconds (improved from baseline)'
\echo '  ✅ Current locks: 0 locks'
\echo '  ✅ Cooldowns: 2+ second gaps between processing'
\echo ''
\echo 'Next steps:'
\echo '1. Clear browser cache completely'
\echo '2. Test signal creation in UI'
\echo '3. Monitor for next 24 hours'
\echo '4. If issues occur, run rollback script'
\echo ''
\echo '============================================================================'
