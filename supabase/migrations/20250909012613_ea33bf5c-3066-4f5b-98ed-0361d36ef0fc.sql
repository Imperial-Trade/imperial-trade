-- Remove problematic cron jobs that are calling non-existent xeon-stream-processor function
SELECT cron.unschedule('process-xeon-stream-signals') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-xeon-stream-signals');
SELECT cron.unschedule('xeon-stream-processor') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'xeon-stream-processor');  
SELECT cron.unschedule('xeon-stream-processor-backup') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'xeon-stream-processor-backup');