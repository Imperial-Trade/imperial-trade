-- Set up cron job for Xeon Stream signal processing
SELECT cron.schedule(
  'xeon-stream-processor',
  '* * * * *', -- Every minute for real-time processing
  $$
  SELECT
    net.http_post(
        url:='https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/xeon-stream-processor',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg2OTI1MCwiZXhwIjoyMDY3NDQ1MjUwfQ.0tHLp8yWK_lNP_6yrdNn4BqM3kGlWnKMcDf9fYMa2hU"}'::jsonb,
        body:='{"processor": "xeon-stream", "timestamp": "' || now() || '"}'::jsonb
    ) as request_id;
  $$
);