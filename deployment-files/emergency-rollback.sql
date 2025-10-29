-- ============================================================================
-- EMERGENCY ROLLBACK SCRIPT
-- ============================================================================
-- Use this script ONLY IF critical issues occur after deployment
-- This will revert all database changes and restore the old system
-- ============================================================================

\echo '============================================================================'
\echo '⚠️  EMERGENCY ROLLBACK STARTING'
\echo '============================================================================'
\echo ''
\echo 'This will:'
\echo '  1. Drop the new batch processing function'
\echo '  2. Remove the new indexes (optional - they dont hurt)'
\echo '  3. Drop the cooldown tracking table'
\echo '  4. Restore the old alert processing behavior'
\echo ''
\echo 'Press Ctrl+C now to cancel, or press Enter to continue...'
\prompt 'Continue with rollback? (yes/no): ' confirm

-- ============================================================================
-- STEP 1: Drop new batch processing function
-- ============================================================================

\echo ''
\echo '🔄 STEP 1: Dropping new batch processing function...'

DROP FUNCTION IF EXISTS process_price_alerts_batch_v3(text[], jsonb);

\echo '✅ Function dropped: process_price_alerts_batch_v3'

-- ============================================================================
-- STEP 2: Drop new indexes (optional - keeping them won't hurt)
-- ============================================================================

\echo ''
\echo '🔄 STEP 2: Dropping new indexes (optional)...'
\echo 'Note: You can skip this if the indexes are not causing issues'
\echo 'They will only improve query performance'

-- Uncomment these lines if you want to remove the indexes
-- DROP INDEX CONCURRENTLY IF EXISTS idx_alert_monitoring_active_symbol;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_trade_alerts_status_symbol;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_trade_alerts_user_status;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_alert_monitoring_signal_active;

\echo 'ℹ️  Indexes kept (they dont hurt performance)'
\echo 'If you want to remove them, uncomment the DROP INDEX statements in this script'

-- ============================================================================
-- STEP 3: Drop cooldown table and functions
-- ============================================================================

\echo ''
\echo '🔄 STEP 3: Dropping cooldown tracking table and related objects...'

DROP VIEW IF EXISTS alert_processing_stats CASCADE;
DROP FUNCTION IF EXISTS check_alert_processing_cooldown(text, integer);
DROP TABLE IF EXISTS alert_processing_cooldowns CASCADE;

\echo '✅ Dropped: alert_processing_stats view'
\echo '✅ Dropped: check_alert_processing_cooldown function'
\echo '✅ Dropped: alert_processing_cooldowns table'

-- ============================================================================
-- STEP 4: Verify old function still exists
-- ============================================================================

\echo ''
\echo '🔄 STEP 4: Verifying old function still exists...'

SELECT 
  proname as function_name,
  CASE 
    WHEN proname = 'process_price_alerts_enhanced_v2' THEN '✅ OLD FUNCTION EXISTS'
    ELSE '❌ OLD FUNCTION MISSING'
  END as status
FROM pg_proc
WHERE proname = 'process_price_alerts_enhanced_v2';

-- ============================================================================
-- STEP 5: Verify rollback success
-- ============================================================================

\echo ''
\echo '🔄 STEP 5: Verifying rollback success...'

-- Check new function is gone
SELECT 
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'process_price_alerts_batch_v3')
    THEN '✅ New function removed'
    ELSE '⚠️  New function still exists'
  END as batch_v3_status;

-- Check cooldown table is gone
SELECT 
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'alert_processing_cooldowns')
    THEN '✅ Cooldown table removed'
    ELSE '⚠️  Cooldown table still exists'
  END as cooldown_table_status;

-- Check old function still exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'process_price_alerts_enhanced_v2')
    THEN '✅ Old function available'
    ELSE '❌ OLD FUNCTION MISSING - CRITICAL'
  END as old_function_status;

\echo ''
\echo '============================================================================'
\echo '✅ ROLLBACK COMPLETE'
\echo '============================================================================'
\echo ''
\echo 'System status:'
\echo '  ✅ New batch function removed'
\echo '  ✅ Cooldown tracking removed'
\echo '  ✅ Old function still available'
\echo '  ℹ️  Indexes kept (optional to remove)'
\echo ''
\echo 'What happens now:'
\echo '  - The price-ingestor edge function will fall back to old behavior'
\echo '  - Alert processing will run on every price update (no cooldown)'
\echo '  - May experience deadlocks again (original issue)'
\echo ''
\echo 'Next steps:'
\echo '  1. Verify signal creation works again (even if slow)'
\echo '  2. Check edge function logs for errors'
\echo '  3. Investigate what caused the rollback'
\echo '  4. Fix the issue and redeploy when ready'
\echo ''
\echo 'To redeploy after fixing:'
\echo '  1. Address the issue that caused rollback'
\echo '  2. Run pre-deployment verification again'
\echo '  3. Redeploy the migration: 20251029070000_fix_alert_processing_deadlocks.sql'
\echo ''
\echo '============================================================================'

-- ============================================================================
-- OPTIONAL: Emergency monitoring queries
-- ============================================================================

\echo ''
\echo '📊 Emergency monitoring (run these periodically):'
\echo ''

-- Monitor deadlocks
\echo 'Deadlock count (should not increase rapidly):'
SELECT confl_deadlock FROM pg_stat_database_conflicts WHERE datname = current_database();

-- Monitor locks
\echo ''
\echo 'Current locks on trade_alerts:'
SELECT COUNT(*) FROM pg_stat_activity 
WHERE wait_event_type = 'Lock' AND query LIKE '%trade_alerts%' AND state != 'idle';

-- Monitor signal creation
\echo ''
\echo 'Signals created in last 10 minutes:'
SELECT COUNT(*) FROM trade_alerts WHERE created_at > NOW() - INTERVAL '10 minutes';

\echo ''
\echo '============================================================================'
