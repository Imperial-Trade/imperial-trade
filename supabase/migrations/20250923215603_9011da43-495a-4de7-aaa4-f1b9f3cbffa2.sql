-- Final optimization migration for ui_price_listeners
-- Set session_id as NOT NULL and update existing NULL values

-- First, update any existing NULL session_ids to proper UUIDs
UPDATE public.ui_price_listeners 
SET session_id = gen_random_uuid()::text
WHERE session_id IS NULL;

-- Now make session_id NOT NULL with a default value
ALTER TABLE public.ui_price_listeners 
ALTER COLUMN session_id SET NOT NULL,
ALTER COLUMN session_id SET DEFAULT gen_random_uuid()::text;

-- Add performance indexes for faster session operations
CREATE INDEX IF NOT EXISTS idx_ui_price_listeners_session_id 
ON public.ui_price_listeners(session_id);

CREATE INDEX IF NOT EXISTS idx_ui_price_listeners_last_seen_at 
ON public.ui_price_listeners(last_seen_at);

CREATE INDEX IF NOT EXISTS idx_ui_price_listeners_user_id_session 
ON public.ui_price_listeners(user_id, session_id);

-- Add unique constraint on session_id to ensure one record per session
ALTER TABLE public.ui_price_listeners 
ADD CONSTRAINT uk_ui_price_listeners_session_id 
UNIQUE (session_id);

-- Update the register_ui_activity function to handle the NOT NULL constraint
CREATE OR REPLACE FUNCTION public.register_ui_activity(
  p_session_id text, 
  p_user_id uuid DEFAULT NULL, 
  p_symbols text[] DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Ensure we have a valid session_id
  IF p_session_id IS NULL OR p_session_id = '' THEN
    p_session_id := gen_random_uuid()::text;
  END IF;
  
  INSERT INTO public.ui_price_listeners (session_id, user_id, symbols, last_seen_at, created_at)
  VALUES (p_session_id, p_user_id, p_symbols, now(), now())
  ON CONFLICT (session_id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    symbols = EXCLUDED.symbols,
    last_seen_at = now();
    
  -- Clean up old sessions (older than 10 minutes) - now optimized with index
  DELETE FROM public.ui_price_listeners 
  WHERE last_seen_at < now() - interval '10 minutes';
END;
$function$;