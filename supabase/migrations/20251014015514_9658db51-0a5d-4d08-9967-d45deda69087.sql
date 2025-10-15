-- ============================================
-- FIX: Restart Price Monitoring Cron Job
-- ============================================
-- Problem: Job exists but never executes due to:
--   1. Missing x-supabase-cron-secret header in HTTP request
--   2. pg_cron never picked up the job from previous migration
-- Solution: Unschedule + Reschedule with correct headers
-- CRON_SECRET: 7f8e9a2b-4c5d-4e6f-8a9b-1c2d3e4f5a6b
-- Expected Result: 6 executions per minute, automatic SL/TP monitoring
-- ============================================

-- Step 1: Remove the broken cron job
DO $$
BEGIN
    PERFORM cron.unschedule('automated-price-monitoring');
    RAISE NOTICE '✅ Step 1: Unscheduled old job (Job ID: 22)';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Step 1: Job may not exist (safe to continue)';
END $$;

-- Step 2: Verify removal (should return 0 rows)
SELECT 
    COUNT(*) AS remaining_jobs,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ Old job removed successfully'
        ELSE '⚠️ Old job still exists - may need manual removal'
    END AS status
FROM cron.job 
WHERE jobname = 'automated-price-monitoring';

-- Step 3: Recreate cron job with CORRECT headers (including x-supabase-cron-secret)
SELECT cron.schedule(
    'automated-price-monitoring',
    '*/10 * * * * *',  -- Every 10 seconds = 6 executions per minute
    $$
    SELECT net.http_post(
        url := 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/price-monitoring',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg2OTI1MCwiZXhwIjoyMDY3NDQ1MjUwfQ.0tHLp8yWK_lNP_6yrdNn4BqM3kGlWnKMcDf9fYMa2hU',
            'x-supabase-cron-secret', '7f8e9a2b-4c5d-4e6f-8a9b-1c2d3e4f5a6b'
        ),
        body := '{}'::jsonb
    ) AS request_id;
    $$
) AS new_job_id;

-- Step 4: Verify new job was created and is active
SELECT 
    jobid,
    jobname,
    schedule,
    active,
    nodename,
    database,
    CASE 
        WHEN active THEN '✅ Job created and active!'
        ELSE '❌ Job created but not active'
    END AS status
FROM cron.job 
WHERE jobname = 'automated-price-monitoring';

-- Step 5: Log the fix for audit trail
INSERT INTO cron_job_logs (
    job_name,
    execution_time,
    records_affected,
    status,
    error_message
) VALUES (
    'cron-job-fix',
    NOW(),
    1,
    'success',
    'Recreated automated-price-monitoring job with x-supabase-cron-secret header. UUID: 7f8e9a2b-4c5d-4e6f-8a9b-1c2d3e4f5a6b. Previous job (ID: 22) was missing this header and never executed.'
);

-- Step 6: Display success message and next steps
SELECT 
    '✅ MIGRATION COMPLETE' AS status,
    'Wait 20-30 seconds then run verification query' AS next_step,
    '7f8e9a2b-4c5d-4e6f-8a9b-1c2d3e4f5a6b' AS cron_secret_used,
    'Expected: 6 log entries per minute in cron_job_logs' AS expected_behavior;