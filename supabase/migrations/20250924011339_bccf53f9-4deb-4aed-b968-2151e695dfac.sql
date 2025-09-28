-- Clean up duplicate order-trigger-monitor CRON jobs
-- Keep only 'order-trigger-monitor-optimized' (every 10s)

-- Remove duplicate order-trigger-monitor jobs
SELECT cron.unschedule('order-trigger-monitor-10s') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'order-trigger-monitor-10s');
SELECT cron.unschedule('order-trigger-monitor-job') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'order-trigger-monitor-job');

-- Log the cleanup
INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
VALUES ('cron_cleanup', NOW(), 2, 'success', 'Removed duplicate order-trigger-monitor CRON jobs, kept only order-trigger-monitor-optimized');