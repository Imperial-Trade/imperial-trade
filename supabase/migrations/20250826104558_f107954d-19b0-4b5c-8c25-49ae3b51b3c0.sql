
-- PRIORITY 4: Advanced Performance Features - Phase 1: Database Performance Optimization
-- Critical indexes for high-frequency trading operations

-- 1. Alert Monitoring Performance (Real-time price checking)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alert_monitoring_active_symbol_price 
ON alert_monitoring (symbol, is_active, target_price) 
WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alert_monitoring_signal_active 
ON alert_monitoring (signal_id, is_active, alert_type) 
WHERE is_active = true;

-- 2. Trade Alerts High-Frequency Queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trade_alerts_user_status_created 
ON trade_alerts (user_id, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trade_alerts_symbol_status_active 
ON trade_alerts (tradermade_symbol, status, activated_at DESC) 
WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trade_alerts_educator_signals 
ON trade_alerts (user_id, created_at DESC) 
WHERE user_id IN (
  SELECT id FROM profiles 
  WHERE user_type = 'educator' OR access_level IN ('admin', 'moderator')
);

-- 3. Market Prices Real-time Updates
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_market_prices_symbol_timestamp 
ON market_prices (symbol, timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_market_prices_updated_recent 
ON market_prices (updated_at DESC, symbol) 
WHERE updated_at > now() - interval '1 hour';

-- 4. User Performance Queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_active_notifications 
ON profiles (account_status, push_subscription_active, onesignal_player_id) 
WHERE account_status = 'active' AND push_subscription_active = true;

-- 5. Rate Limiting Performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rate_limits_active_window 
ON rate_limits (identifier, limit_type, window_start DESC) 
WHERE window_start > now() - interval '24 hours';

-- 6. Notification Performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notification_batch_queue_processing 
ON notification_batch_queue (scheduled_at, processed_at) 
WHERE processed_at IS NULL;

-- 7. Real-time Subscription Performance  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_device_subscriptions_active_users 
ON device_subscriptions (user_id, is_active, last_seen_at DESC) 
WHERE is_active = true;

-- 8. Audit and Monitoring Performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cron_job_logs_recent_performance 
ON cron_job_logs (job_name, execution_time DESC, status) 
WHERE execution_time > now() - interval '24 hours';

-- 9. Forum Performance (if used in signal discussions)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forum_posts_recent_active 
ON forum_posts (created_at DESC, deleted_at) 
WHERE deleted_at IS NULL;

-- 10. Partial indexes for specific high-frequency patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trade_alerts_pending_limits 
ON trade_alerts (expires_at, expiry_type, status) 
WHERE status = 'pending' AND trade_type IN ('buy_limit', 'sell_limit');

-- Performance statistics update for query planner optimization
ANALYZE alert_monitoring;
ANALYZE trade_alerts; 
ANALYZE market_prices;
ANALYZE profiles;
ANALYZE notification_batch_queue;
ANALYZE device_subscriptions;

-- Add comments for maintenance
COMMENT ON INDEX idx_alert_monitoring_active_symbol_price IS 'Critical for real-time price alert checking - covers 80% of monitoring queries';
COMMENT ON INDEX idx_trade_alerts_user_status_created IS 'Primary user signal dashboard query optimization';
COMMENT ON INDEX idx_market_prices_symbol_timestamp IS 'Real-time price update and retrieval optimization';
