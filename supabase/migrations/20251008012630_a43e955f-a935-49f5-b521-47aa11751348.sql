-- Drop the unused update_trade_alert_safe RPC function
-- This function is no longer used as we've migrated to direct Supabase updates with RLS
DROP FUNCTION IF EXISTS public.update_trade_alert_safe(
  p_id UUID,
  p_status TEXT,
  p_tp_hits INTEGER[],
  p_close_reason TEXT,
  p_notes TEXT,
  p_is_xeon_stream BOOLEAN
);

-- Add comment documenting that updates are now handled via direct Supabase client with RLS
COMMENT ON TABLE public.trade_alerts IS 'Trade alerts table - updates handled via direct Supabase client with RLS policies for authorization';