-- **PHASE 1: CREATE BACKUP CRON JOB**
-- Create the backup cron job to run every 10 seconds
SELECT cron.schedule(
  'xeon-stream-processor-backup',
  '*/10 * * * * *', -- Every 10 seconds as backup
  $$
  SELECT net.http_post(
    url := 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/xeon-stream-processor',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg2OTI1MCwiZXhwIjoyMDY3NDQ1MjUwfQ.0tHLp8yWK_lNP_6yrdNn4BqM3kGlWnKMcDf9fYMa2hU"}'::jsonb,
    body := jsonb_build_object(
      'trigger_source', 'cron_backup',
      'timestamp', extract(epoch from now())
    )
  ) as request_id;
  $$
);