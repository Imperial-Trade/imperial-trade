-- Add event_key column to notification_delivery_log and ensure proper constraints
ALTER TABLE public.notification_delivery_log 
ADD COLUMN IF NOT EXISTS event_key TEXT;

-- Ensure columns are NOT NULL (some may already be, but this ensures it)
ALTER TABLE public.notification_delivery_log 
ALTER COLUMN user_id SET NOT NULL,
ALTER COLUMN delivery_channel SET NOT NULL,
ALTER COLUMN status SET NOT NULL,
ALTER COLUMN created_at SET NOT NULL;

-- Ensure metadata is JSONB (should already be, but verify)
ALTER TABLE public.notification_delivery_log 
ALTER COLUMN metadata TYPE JSONB USING metadata::JSONB;

-- Create unique index for claim-before-send idempotency (no WHERE clause)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_ndl_user_chan_event 
ON public.notification_delivery_log (user_id, delivery_channel, ((metadata->>'event_key')));

-- Create DESC index on created_at for efficient parity queries
CREATE INDEX IF NOT EXISTS idx_ndl_created_at_desc 
ON public.notification_delivery_log (created_at DESC);

-- Create cleanup function for old notification logs (45-60d TTL)
CREATE OR REPLACE FUNCTION public.cleanup_old_notification_logs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    deleted_count INTEGER := 0;
    error_msg TEXT;
BEGIN
    -- Delete logs older than 45 days
    DELETE FROM public.notification_delivery_log 
    WHERE created_at < NOW() - INTERVAL '45 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Try to log to cron_job_logs if it exists, but don't fail if it doesn't
    BEGIN
        INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status)
        VALUES ('cleanup_old_notification_logs', NOW(), deleted_count, 'success');
    EXCEPTION WHEN OTHERS THEN
        -- Log table doesn't exist or other error - continue silently
        NULL;
    END;
    
    RETURN deleted_count;
    
EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS error_msg = MESSAGE_TEXT;
    
    -- Try to log error, but don't fail if logging fails
    BEGIN
        INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
        VALUES ('cleanup_old_notification_logs', NOW(), 0, 'error', error_msg);
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    -- Re-raise the exception
    RAISE;
END;
$function$;

-- Try to schedule cleanup with pg_cron if available (will fail silently if not installed)
DO $schedule_cleanup$
BEGIN
    -- Schedule cleanup to run daily at 2 AM
    PERFORM cron.schedule(
        'cleanup-notification-logs',
        '0 2 * * *',
        'SELECT public.cleanup_old_notification_logs();'
    );
EXCEPTION WHEN OTHERS THEN
    -- pg_cron not available - that's OK, we can run via scheduled Edge Function
    NULL;
END $schedule_cleanup$;