-- Create UI Price Listeners heartbeat table
CREATE TABLE ui_price_listeners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS for UI price listeners
ALTER TABLE ui_price_listeners ENABLE ROW LEVEL SECURITY;

-- Policy for users to manage their own heartbeat
CREATE POLICY "Users can manage their own heartbeat"
ON ui_price_listeners
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create price broadcast lock table for global lock system
CREATE TABLE price_broadcast_lock (
  id text PRIMARY KEY DEFAULT 'singleton',
  holder_id text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS for price broadcast lock
ALTER TABLE price_broadcast_lock ENABLE ROW LEVEL SECURITY;

-- Policy for system to manage broadcast lock
CREATE POLICY "System can manage broadcast lock"
ON price_broadcast_lock
FOR ALL
USING (true)
WITH CHECK (true);

-- Policy for admins to view broadcast lock
CREATE POLICY "Admins can view broadcast lock"
ON price_broadcast_lock
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create function to acquire broadcast lock
CREATE OR REPLACE FUNCTION acquire_broadcast_lock(p_holder_id text, p_duration_seconds integer DEFAULT 30)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create function to check active UI listeners
CREATE OR REPLACE FUNCTION has_active_ui_listeners(p_threshold_seconds integer DEFAULT 120)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
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