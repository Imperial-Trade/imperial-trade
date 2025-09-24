-- PHASE 1: Emergency Cleanup - Remove ALL price-related CRON jobs that deviate from approved architecture

-- Remove the ui-price-heartbeat CRON job (architectural deviation)
SELECT cron.unschedule('ui-price-heartbeat-2s') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ui-price-heartbeat-2s');

-- Remove any price-ingestor CRON jobs (architectural deviation - price-ingestor should only receive TraderMade data)
SELECT cron.unschedule('price-ingestor-2s-job') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'price-ingestor-2s-job');
SELECT cron.unschedule('price-ingestor-v4-realtime') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'price-ingestor-v4-realtime');

-- Keep only ONE order-trigger-monitor job (every 10 seconds)
SELECT cron.unschedule('order-trigger-monitor') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'order-trigger-monitor');

-- Ensure we have the correct order-trigger-monitor (every 10s)
SELECT cron.schedule(
  'order-trigger-monitor-optimized',
  '*/10 * * * * *', -- Every 10 seconds
  $$
  select
    net.http_post(
        url:='https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/order-trigger-monitor',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg2OTI1MCwiZXhwIjoyMDY3NDQ1MjUwfQ.0tHLp8yWK_lNP_6yrdNn4BqM3kGlWnKMcDf9fYMa2hU"}'::jsonb,
        body:=concat('{"timestamp": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- Log the architectural correction
INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
VALUES 
  ('architectural_correction', NOW(), 1, 'success', 'PHASE 1 Complete: Removed price-ingestor and ui-price-heartbeat CRON jobs, restored single order-trigger-monitor'),
  ('approved_architecture_restored', NOW(), 1, 'success', 'System restored to approved TraderMade → DigitalOcean → price-ingestor → Frontend pipeline');