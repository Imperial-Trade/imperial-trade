-- Create cron job to fetch economic events every 3 hours
SELECT cron.schedule(
  'fetch-economic-events-3h',
  '0 */3 * * *', -- Every 3 hours at minute 0
  $$
  SELECT
    net.http_post(
        url:='https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/fetch-economic-events',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4NjkyNTAsImV4cCI6MjA2NzQ0NTI1MH0.gvBGgPvvOYwMI9g8H5Cm9rKFB02G6z4tHIHEepKf7MI"}'::jsonb,
        body:=concat('{"scheduled_run": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);