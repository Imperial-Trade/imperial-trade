-- Clean up all existing rate limit records
DELETE FROM rate_limits WHERE identifier = 'unknown-client';

-- Optimize the cleanup function to run every hour
SELECT cron.schedule('cleanup-rate-limits-hourly', '0 * * * *', 'SELECT cleanup_old_rate_limits();');