-- 🔥 CRITICAL FIX: Create price ingestor CRON job for 2-second updates
-- This will fix the 6-second price delay issue by ensuring consistent price updates

-- Enable required extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create the price ingestor CRON job to run every 2 seconds
SELECT cron.schedule(
  'price-ingestor-v4-realtime',
  '*/2 * * * * *', -- Every 2 seconds for professional grade updates
  $$
  SELECT
    net.http_post(
        url:='https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/price-ingestor',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg2OTI1MCwiZXhwIjoyMDY3NDQ1MjUwfQ.0tHLp8yWK_lNP_6yrdNn4BqM3kGlWnKMcDf9fYMa2hU"}'::jsonb,
        body:='{"source": "cron_scheduler", "timestamp": "' || now()::text || '"}'::jsonb
    ) as request_id;
  $$
);

-- Create cleanup job for old UI price listeners (runs every 5 minutes)
SELECT cron.schedule(
  'cleanup-ui-price-listeners',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT cleanup_old_ui_listeners();
  $$
);

-- Log successful CRON job creation
INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
VALUES ('price_ingestor_cron_setup', NOW(), 2, 'success', '✅ Price ingestor CRON job created for 2-second updates + UI cleanup job');