-- Create CRON jobs for guaranteed 2-second UI updates and limit order monitoring

-- 1. UI Price Heartbeat - Every 2 seconds for guaranteed UI updates
SELECT cron.schedule(
  'ui-price-heartbeat-2s',
  '*/2 * * * * *', -- Every 2 seconds
  $$
  select
    net.http_post(
        url:='https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/ui-price-heartbeat',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg2OTI1MCwiZXhwIjoyMDY3NDQ1MjUwfQ.0tHLp8yWK_lNP_6yrdNn4BqM3kGlWnKMcDf9fYMa2hU"}'::jsonb,
        body:=concat('{"timestamp": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- 2. Optimize existing order-trigger-monitor to run every 10 seconds
SELECT cron.unschedule('order-trigger-monitor-10s') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'order-trigger-monitor-10s');

SELECT cron.schedule(
  'order-trigger-monitor-10s',  
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

-- Log the CRON job setup
INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
VALUES 
  ('ui-price-heartbeat-2s', NOW(), 1, 'success', 'UI Price Heartbeat CRON job scheduled for 2-second intervals'),
  ('order-trigger-monitor-10s', NOW(), 1, 'success', 'Order Trigger Monitor CRON job scheduled for 10-second intervals');