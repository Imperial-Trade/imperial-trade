-- Fix search path for the new functions we just created
CREATE OR REPLACE FUNCTION acquire_broadcast_lock(p_holder_id text, p_duration_seconds integer DEFAULT 30)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  lock_acquired boolean := false;
BEGIN
  -- Try to acquire or refresh the lock
  INSERT INTO price_broadcast_lock (id, holder_id, expires_at, updated_at)
  VALUES ('singleton', p_holder_id, now() + (p_duration_seconds || ' seconds')::interval, now())
  ON CONFLICT (id) DO UPDATE SET
    holder_id = EXCLUDED.holder_id,
    expires_at = EXCLUDED.expires_at,
    updated_at = now()
  WHERE price_broadcast_lock.expires_at < now() OR price_broadcast_lock.holder_id = p_holder_id;
  
  -- Check if we successfully acquired the lock
  SELECT (holder_id = p_holder_id AND expires_at > now()) INTO lock_acquired
  FROM price_broadcast_lock
  WHERE id = 'singleton';
  
  RETURN COALESCE(lock_acquired, false);
END;
$$;

CREATE OR REPLACE FUNCTION has_active_ui_listeners(p_threshold_seconds integer DEFAULT 120)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  active_count integer;
BEGIN
  SELECT COUNT(*)
  INTO active_count
  FROM ui_price_listeners
  WHERE last_seen_at > now() - (p_threshold_seconds || ' seconds')::interval;
  
  RETURN active_count > 0;
END;
$$;