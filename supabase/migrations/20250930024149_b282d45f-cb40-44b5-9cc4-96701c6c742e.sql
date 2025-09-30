-- Fix has_active_ui_listeners() to query correct table and column
CREATE OR REPLACE FUNCTION public.has_active_ui_listeners(p_threshold_seconds integer DEFAULT 60)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  has_recent_activity boolean := false;
BEGIN
  -- ✅ FIXED: Query ui_activity_sessions (not ui_price_listeners)
  -- ✅ FIXED: Use last_activity_at (not last_seen_at)
  SELECT EXISTS(
    SELECT 1 FROM ui_activity_sessions 
    WHERE last_activity_at > now() - (p_threshold_seconds || ' seconds')::interval
    LIMIT 1
  ) INTO has_recent_activity;
  
  RETURN has_recent_activity;
END;
$function$;