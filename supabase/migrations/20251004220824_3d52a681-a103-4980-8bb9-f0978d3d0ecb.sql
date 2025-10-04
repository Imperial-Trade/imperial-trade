-- PHASE 3: Aggressive session cleanup to prevent stale user detection
-- Reduces cleanup threshold from 10 minutes to 2 minutes to eliminate phantom connections

-- Update register_ui_activity_enhanced to clean up every 2 minutes instead of 10
CREATE OR REPLACE FUNCTION public.register_ui_activity_enhanced(
  p_session_id text,
  p_user_id uuid,
  p_symbols text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Validate session_id
    IF p_session_id IS NULL OR p_session_id = '' THEN
        RAISE EXCEPTION 'Invalid session_id provided';
    END IF;
    
    -- Insert/update ui_price_listeners
    INSERT INTO public.ui_price_listeners (session_id, user_id, symbols, last_seen_at, created_at)
    VALUES (p_session_id, p_user_id, p_symbols, now(), now())
    ON CONFLICT (session_id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        symbols = EXCLUDED.symbols,
        last_seen_at = now();
    
    -- Also keep ui_activity_sessions for compatibility
    INSERT INTO public.ui_activity_sessions (session_id, user_id, symbols, last_activity_at, updated_at)
    VALUES (p_session_id, p_user_id, p_symbols, now(), now())
    ON CONFLICT (session_id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        symbols = EXCLUDED.symbols,
        last_activity_at = now(),
        updated_at = now();
        
    -- 🔥 AGGRESSIVE CLEANUP: Remove sessions older than 2 minutes (not 10)
    DELETE FROM public.ui_price_listeners 
    WHERE last_seen_at < now() - interval '2 minutes';
    
    DELETE FROM public.ui_activity_sessions 
    WHERE last_activity_at < now() - interval '2 minutes';
    
EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the operation
    INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
    VALUES (
        'register_ui_activity_enhanced', 
        now(), 
        0, 
        'error',
        'Failed to register UI activity: ' || SQLERRM
    );
END;
$$;

-- Create function for automatic cleanup (can be scheduled via pg_cron or edge function)
CREATE OR REPLACE FUNCTION public.auto_cleanup_stale_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.ui_price_listeners 
    WHERE last_seen_at < now() - interval '2 minutes';
    
    DELETE FROM public.ui_activity_sessions 
    WHERE last_activity_at < now() - interval '2 minutes';
END;
$$;

COMMENT ON FUNCTION public.auto_cleanup_stale_sessions() IS 
'Call this function every 60 seconds to aggressively clean up stale sessions. Can be scheduled via pg_cron or edge function.';

-- Log the fix
INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
VALUES (
    'aggressive_session_cleanup', 
    NOW(), 
    1, 
    'success',
    'PHASE 3 COMPLETE: Reduced session cleanup threshold from 10 minutes to 2 minutes'
);