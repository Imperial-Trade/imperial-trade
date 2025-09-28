-- Fix ui_price_listeners table to match the register_ui_activity function expectations
ALTER TABLE public.ui_price_listeners 
ADD COLUMN IF NOT EXISTS session_id text,
ADD COLUMN IF NOT EXISTS symbols text[] DEFAULT '{}';

-- Update the register_ui_activity function to work correctly
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
  INSERT INTO public.ui_price_listeners (session_id, user_id, symbols, last_seen_at, created_at)
  VALUES (p_session_id, p_user_id, p_symbols, now(), now())
  ON CONFLICT (session_id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    symbols = EXCLUDED.symbols,
    last_seen_at = now();
    
  -- Clean up old sessions (older than 10 minutes)
  DELETE FROM public.ui_price_listeners 
  WHERE last_seen_at < now() - interval '10 minutes';
END;
$function$;