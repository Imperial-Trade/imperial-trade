-- CRITICAL FIX: Remove incorrect unique constraint on user_id from ui_price_listeners
-- The constraint should be on session_id, not user_id (users can have multiple sessions)

-- Drop the incorrect unique constraint on user_id that's causing the 409 errors
ALTER TABLE public.ui_price_listeners 
DROP CONSTRAINT IF EXISTS ui_price_listeners_user_id_key;

-- Clean up any duplicate user_id records that might exist (using created_at instead of id)
DELETE FROM public.ui_price_listeners 
WHERE created_at NOT IN (
    SELECT MIN(created_at) 
    FROM public.ui_price_listeners 
    GROUP BY user_id
);

-- Log the fix
INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
VALUES ('fix_ui_activity_constraints', NOW(), 1, 'success', 'Removed incorrect user_id unique constraint, allowing multiple sessions per user');