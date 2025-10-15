-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule price-monitoring edge function every 10 seconds
SELECT cron.schedule(
  'automated-price-monitoring',
  '*/10 * * * * *',
  $$
  SELECT net.http_post(
    url := 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/price-monitoring',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg2OTI1MCwiZXhwIjoyMDY3NDQ1MjUwfQ.0tHLp8yWK_lNP_6yrdNn4BqM3kGlWnKMcDf9fYMa2hU'
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- Log the cron job creation
INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
VALUES (
  'cron_setup', 
  NOW(), 
  1, 
  'success',
  'Automated price-monitoring cron job created - triggers every 10 seconds'
);