-- ============================================
-- EMERGENCY ROLLBACK PROCEDURES
-- Imperial Trading Platform - Signal Stream Fixes
-- ============================================

-- ============================================
-- ROLLBACK #1: REVERT TEST SIGNAL
-- Use if test signal causes issues
-- ============================================

-- Delete test signal (safe - doesn't affect real user data)
DELETE FROM trade_alerts
WHERE asset_name = 'GOLD - Test Signal'
  AND tradermade_symbol = 'XAUUSD'
  AND entry_price = 3900.00;

-- Verify deletion
SELECT COUNT(*) as remaining_test_signals
FROM trade_alerts
WHERE asset_name LIKE '%Test Signal%';
-- Expected: 0

-- ============================================
-- ROLLBACK #2: DISABLE ALERT PROCESSING
-- Use if alerts cause incorrect signal closures
-- ============================================

-- Temporarily disable all alert monitoring
UPDATE alert_monitoring
SET is_active = false
WHERE is_active = true;

-- Verify all alerts disabled
SELECT 
  is_active,
  COUNT(*) as count
FROM alert_monitoring
GROUP BY is_active;
-- Expected: is_active=false with count > 0

-- TO RE-ENABLE LATER:
-- UPDATE alert_monitoring SET is_active = true;

-- ============================================
-- ROLLBACK #3: FREEZE LIMIT ORDER ACTIVATION
-- Use if limit orders activate incorrectly
-- ============================================

-- Prevent new limit order activations
-- (No SQL needed - rollback edge function instead)

-- Check pending limit orders count
SELECT 
  trade_type,
  COUNT(*) as count,
  MIN(created_at) as oldest_pending
FROM trade_alerts
WHERE status = 'pending'
  AND trade_type IN ('buy_limit', 'sell_limit')
GROUP BY trade_type;

-- ============================================
-- ROLLBACK #4: MANUAL SIGNAL CLOSURE FIXES
-- Use if signals auto-closed incorrectly
-- ============================================

-- Find recently closed signals (last 10 minutes)
SELECT 
  id,
  asset_name,
  user_id,
  close_reason,
  updated_at,
  status
FROM trade_alerts
WHERE status = 'closed'
  AND updated_at > NOW() - INTERVAL '10 minutes'
ORDER BY updated_at DESC;

-- Reopen incorrectly closed signal (replace <signal_id>)
UPDATE trade_alerts
SET 
  status = 'active',
  close_reason = NULL,
  updated_at = NOW()
WHERE id = '<signal_id>'
  AND status = 'closed';

-- Verify reopen
SELECT id, asset_name, status, close_reason
FROM trade_alerts
WHERE id = '<signal_id>';

-- ============================================
-- ROLLBACK #5: RESET INCORRECT TP HITS
-- Use if TPs marked as hit incorrectly
-- ============================================

-- Find signals with recent TP hits (last 10 minutes)
SELECT 
  id,
  asset_name,
  tp_hits,
  array_length(tp_hits, 1) as tp_count,
  updated_at
FROM trade_alerts
WHERE tp_hits IS NOT NULL
  AND array_length(tp_hits, 1) > 0
  AND updated_at > NOW() - INTERVAL '10 minutes'
ORDER BY updated_at DESC;

-- Clear incorrect TP hits (replace <signal_id>)
UPDATE trade_alerts
SET 
  tp_hits = ARRAY[]::INTEGER[],
  updated_at = NOW()
WHERE id = '<signal_id>';

-- Verify reset
SELECT id, asset_name, tp_hits
FROM trade_alerts
WHERE id = '<signal_id>';

-- ============================================
-- ROLLBACK #6: EMERGENCY STOP ALL AUTOMATION
-- Use for complete system pause
-- ============================================

-- 1. Disable alert monitoring
UPDATE alert_monitoring SET is_active = false;

-- 2. Document all pending limit orders
CREATE TABLE IF NOT EXISTS temp_pending_limits AS
SELECT * FROM trade_alerts
WHERE status = 'pending'
  AND trade_type IN ('buy_limit', 'sell_limit');

-- 3. Verify backup created
SELECT COUNT(*) as backup_count FROM temp_pending_limits;

-- 4. Stop edge function (manual in Supabase dashboard)
-- Navigate to: Functions > price-ingestor > Pause

-- TO RESUME:
-- 1. UPDATE alert_monitoring SET is_active = true;
-- 2. DROP TABLE temp_pending_limits;
-- 3. Resume edge function in dashboard

-- ============================================
-- VERIFICATION QUERIES
-- Run these after any rollback
-- ============================================

-- Check alert monitoring status
SELECT 
  is_active,
  COUNT(*) as count
FROM alert_monitoring
GROUP BY is_active;

-- Check recent signal changes
SELECT 
  status,
  close_reason,
  COUNT(*) as count
FROM trade_alerts
WHERE updated_at > NOW() - INTERVAL '30 minutes'
GROUP BY status, close_reason
ORDER BY count DESC;

-- Check TP hits activity
SELECT 
  COUNT(*) as signals_with_tp_hits,
  SUM(array_length(tp_hits, 1)) as total_tps_hit
FROM trade_alerts
WHERE tp_hits IS NOT NULL
  AND array_length(tp_hits, 1) > 0
  AND updated_at > NOW() - INTERVAL '30 minutes';

-- ============================================
-- EMERGENCY CONTACTS
-- ============================================

-- If rollback fails, contact:
-- 1. Database Admin: [Your Email]
-- 2. DevOps Lead: [Your Email]  
-- 3. Platform Owner: [Your Email]

-- Supabase Dashboard:
-- https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi

-- Edge Function Logs:
-- https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/functions/price-ingestor/logs

-- Database SQL Editor:
-- https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/sql/new
