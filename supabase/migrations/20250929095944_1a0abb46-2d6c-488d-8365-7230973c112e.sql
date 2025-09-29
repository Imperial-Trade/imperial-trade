-- Create a database function to handle the manual JOIN for trade alerts with profiles
CREATE OR REPLACE FUNCTION get_alerts_with_profiles()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  asset_name text,
  tradermade_symbol text,
  trade_type text,
  entry_price numeric,
  stop_loss numeric,
  status text,
  tp1 numeric,
  tp2 numeric,
  tp3 numeric,
  tp4 numeric,
  tp5 numeric,
  tp_hits integer[],
  notes text,
  close_reason text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  profile_id uuid,
  display_name text,
  role text,
  avatar_url text,
  user_type user_type_enum,
  access_level access_level_enum
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ta.id,
    ta.user_id,
    ta.asset_name,
    ta.tradermade_symbol,
    ta.trade_type,
    ta.entry_price,
    ta.stop_loss,
    ta.status,
    ta.tp1,
    ta.tp2,
    ta.tp3,
    ta.tp4,
    ta.tp5,
    ta.tp_hits,
    ta.notes,
    ta.close_reason,
    ta.created_at,
    ta.updated_at,
    p.id as profile_id,
    p.display_name,
    p.role,
    p.avatar_url,
    p.user_type,
    p.access_level
  FROM trade_alerts ta
  LEFT JOIN profiles p ON ta.user_id = p.id
  ORDER BY ta.created_at DESC;
$$;