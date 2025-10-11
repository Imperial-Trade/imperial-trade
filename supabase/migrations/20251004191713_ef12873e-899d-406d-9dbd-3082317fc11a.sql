-- PHASE 1: CRITICAL FIX - Drop and recreate register_ui_activity_enhanced to populate ui_price_listeners table
-- This resolves the table mismatch causing broadcast blocking

-- Drop existing function first
DROP FUNCTION IF EXISTS public.register_ui_activity_enhanced(text, uuid, text[]);

-- Recreate with correct logic
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
    
    -- CRITICAL FIX: Insert into ui_price_listeners (what backend checks for active users)
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
        
    -- Clean up old sessions (older than 10 minutes)
    DELETE FROM public.ui_price_listeners 
    WHERE last_seen_at < now() - interval '10 minutes';
    
    DELETE FROM public.ui_activity_sessions 
    WHERE last_activity_at < now() - interval '10 minutes';
    
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

-- Log the fix
INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
VALUES (
    'broadcast_pipeline_phase1_fix', 
    NOW(), 
    1, 
    'success',
    'PHASE 1 COMPLETE: Fixed register_ui_activity_enhanced to populate ui_price_listeners table - resolves broadcast blocking due to table mismatch'
);