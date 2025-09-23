-- 🚀 ACTIVITY-BASED RESOURCE MANAGEMENT
-- Create function to check for active UI listeners (prevents waste during idle periods)
CREATE OR REPLACE FUNCTION public.has_active_ui_listeners(p_threshold_seconds integer DEFAULT 60)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  has_recent_activity boolean := false;
BEGIN
  -- Check for recent price requests (database queries indicate active users)
  SELECT EXISTS(
    SELECT 1 FROM market_prices 
    WHERE updated_at > now() - (p_threshold_seconds || ' seconds')::interval
    LIMIT 1
  ) INTO has_recent_activity;
  
  -- If no recent price updates, check for recent user activity
  IF NOT has_recent_activity THEN
    SELECT EXISTS(
      SELECT 1 FROM profiles 
      WHERE updated_at > now() - (p_threshold_seconds || ' seconds')::interval
      OR last_login > now() - (p_threshold_seconds || ' seconds')::interval
      LIMIT 1
    ) INTO has_recent_activity;
  END IF;
  
  RETURN has_recent_activity;
END;
$$;

-- Create UI price listeners table for tracking active UI sessions
CREATE TABLE IF NOT EXISTS public.ui_price_listeners (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text NOT NULL,
  user_id uuid,
  symbols text[] DEFAULT '{}',
  last_seen_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on UI price listeners
ALTER TABLE public.ui_price_listeners ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for UI listeners
CREATE POLICY "Users can manage their UI listeners"
ON public.ui_price_listeners
FOR ALL
USING (auth.uid() = user_id OR user_id IS NULL);

-- Create function to register UI activity
CREATE OR REPLACE FUNCTION public.register_ui_activity(p_session_id text, p_user_id uuid DEFAULT NULL, p_symbols text[] DEFAULT '{}')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.ui_price_listeners (session_id, user_id, symbols, last_seen_at)
  VALUES (p_session_id, p_user_id, p_symbols, now())
  ON CONFLICT (session_id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    symbols = EXCLUDED.symbols,
    last_seen_at = now(),
    updated_at = now();
END;
$$;

-- Cleanup function for old UI listeners
CREATE OR REPLACE FUNCTION public.cleanup_old_ui_listeners()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.ui_price_listeners 
  WHERE last_seen_at < now() - interval '5 minutes';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;