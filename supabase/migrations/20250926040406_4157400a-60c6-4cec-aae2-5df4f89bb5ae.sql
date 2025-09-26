-- 🚨 PHASE 2: Fixed session cleanup with proper PostgreSQL syntax
-- This function now includes better session deduplication and cleanup

CREATE OR REPLACE FUNCTION public.cleanup_duplicate_ui_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  deleted_count INTEGER := 0;
  temp_count INTEGER;
  user_sessions RECORD;
BEGIN
  -- Clean up duplicate sessions for each user (keep only the most recent)
  FOR user_sessions IN 
    SELECT user_id, COUNT(*) as session_count
    FROM ui_price_listeners 
    WHERE user_id IS NOT NULL
    GROUP BY user_id
    HAVING COUNT(*) > 1
  LOOP
    -- Delete all but the most recent session for this user
    DELETE FROM ui_price_listeners 
    WHERE user_id = user_sessions.user_id 
    AND session_id NOT IN (
      SELECT session_id 
      FROM ui_price_listeners 
      WHERE user_id = user_sessions.user_id 
      ORDER BY last_seen_at DESC 
      LIMIT 1
    );
    
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
  END LOOP;
  
  -- Also clean up very old sessions (older than 24 hours)
  DELETE FROM ui_price_listeners 
  WHERE last_seen_at < now() - interval '24 hours';
  
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_count := deleted_count + temp_count;
  
  -- Log the cleanup
  INSERT INTO cron_job_logs (job_name, execution_time, records_affected, status, error_message)
  VALUES (
    'cleanup_duplicate_ui_sessions',
    now(),
    deleted_count,
    'success',
    'Cleaned up ' || deleted_count || ' duplicate/old UI sessions'
  );
  
  RETURN deleted_count;
END;
$function$;

-- Enhanced register_ui_activity function with better session management
CREATE OR REPLACE FUNCTION public.register_ui_activity_enhanced(
  p_session_id text, 
  p_user_id uuid DEFAULT NULL::uuid, 
  p_symbols text[] DEFAULT '{}'::text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  existing_sessions INTEGER;
BEGIN
  -- Ensure we have a valid session_id
  IF p_session_id IS NULL OR p_session_id = '' THEN
    p_session_id := gen_random_uuid()::text;
  END IF;
  
  -- 🚨 PHASE 2: Check for duplicate sessions for the same user
  IF p_user_id IS NOT NULL AND p_user_id != '00000000-0000-0000-0000-000000000000' THEN
    SELECT COUNT(*) INTO existing_sessions
    FROM ui_price_listeners 
    WHERE user_id = p_user_id AND session_id != p_session_id;
    
    -- If user has other sessions, clean them up (keep only the newest)
    IF existing_sessions > 0 THEN
      DELETE FROM ui_price_listeners 
      WHERE user_id = p_user_id 
      AND session_id != p_session_id
      AND last_seen_at < now() - interval '5 minutes'; -- Only clean up if older than 5 minutes
    END IF;
  END IF;
  
  -- Insert or update the session
  INSERT INTO public.ui_price_listeners (session_id, user_id, symbols, last_seen_at, created_at)
  VALUES (p_session_id, p_user_id, p_symbols, now(), now())
  ON CONFLICT (session_id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    symbols = EXCLUDED.symbols,
    last_seen_at = now();
    
  -- Clean up old sessions (older than 30 minutes) - more aggressive cleanup
  DELETE FROM public.ui_price_listeners 
  WHERE last_seen_at < now() - interval '30 minutes';
END;
$function$;