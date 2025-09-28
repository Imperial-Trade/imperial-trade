-- Enable pg_cron extension for automated job scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant necessary permissions for cron jobs
GRANT USAGE ON SCHEMA cron TO postgres;

-- Schedule order trigger monitor to run every 10 seconds
SELECT cron.schedule(
  'order-trigger-monitor-job',
  '*/10 * * * * *', -- Every 10 seconds
  $$
  SELECT
    net.http_post(
        url:='https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/order-trigger-monitor',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg2OTI1MCwiZXhwIjoyMDY3NDQ1MjUwfQ.0tHLp8yWK_lNP_6yrdNn4BqM3kGlWnKMcDf9fYMa2hU"}'::jsonb,
        body:='{"triggered_by": "cron_job", "timestamp": "'|| now() ||'"}'::jsonb
    ) as request_id;
  $$
);

-- Schedule price ingestor to run every 2 seconds
SELECT cron.schedule(
  'price-ingestor-2s-job',
  '*/2 * * * * *', -- Every 2 seconds
  $$
  SELECT
    net.http_post(
        url:='https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/price-ingestor',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg2OTI1MCwiZXhwIjoyMDY3NDQ1MjUwfQ.0tHLp8yWK_lNP_6yrdNn4BqM3kGlWnKMcDf9fYMa2hU"}'::jsonb,
        body:='{"triggered_by": "cron_job_2s", "timestamp": "'|| now() ||'"}'::jsonb
    ) as request_id;
  $$
);

-- Create monitoring function for cron job health
CREATE OR REPLACE FUNCTION public.get_cron_job_status()
RETURNS TABLE(
  job_name text,
  schedule text,
  active boolean,
  last_run_started_at timestamp with time zone,
  last_run_ended_at timestamp with time zone,
  last_run_status text
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT 
    cj.jobname::text,
    cj.schedule::text,
    cj.active,
    cjr.start_time as last_run_started_at,
    cjr.end_time as last_run_ended_at,
    CASE 
      WHEN cjr.return_message IS NOT NULL AND cjr.return_message != '' 
      THEN 'error'
      ELSE 'success'
    END as last_run_status
  FROM cron.job cj
  LEFT JOIN cron.job_run_details cjr ON cj.jobid = cjr.jobid
  WHERE cjr.start_time = (
    SELECT MAX(start_time) 
    FROM cron.job_run_details 
    WHERE jobid = cj.jobid
  )
  OR cjr.start_time IS NULL
  ORDER BY cj.jobname;
$$;

-- Log the cron job setup
INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
VALUES ('setup_automated_monitoring', NOW(), 2, 'success', 'Created order-trigger-monitor (10s) and price-ingestor (2s) cron jobs');