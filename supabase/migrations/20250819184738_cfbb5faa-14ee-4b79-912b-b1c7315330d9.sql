-- Clean up orphaned alert monitoring records and fix authorization issues

-- First, remove orphaned alert monitoring records that don't have corresponding active trade alerts
DELETE FROM public.alert_monitoring 
WHERE signal_id NOT IN (
  SELECT id FROM public.trade_alerts WHERE status = 'active'
);

-- Create missing alert monitoring records for active signals that don't have monitoring
INSERT INTO public.alert_monitoring (signal_id, symbol, alert_type, target_price, priority_level)
SELECT 
  ta.id,
  ta.tradermade_symbol,
  'stop_loss',
  ta.stop_loss,
  1
FROM public.trade_alerts ta
WHERE ta.status = 'active'
AND ta.id NOT IN (
  SELECT DISTINCT signal_id 
  FROM public.alert_monitoring 
  WHERE alert_type = 'stop_loss'
);

-- Create missing TP monitoring records
INSERT INTO public.alert_monitoring (signal_id, symbol, alert_type, target_price, priority_level)
SELECT 
  ta.id,
  ta.tradermade_symbol,
  'take_profit_1',
  ta.tp1,
  2
FROM public.trade_alerts ta
WHERE ta.status = 'active'
AND ta.tp1 IS NOT NULL
AND ta.id NOT IN (
  SELECT DISTINCT signal_id 
  FROM public.alert_monitoring 
  WHERE alert_type = 'take_profit_1'
);

-- Add TP2 monitoring
INSERT INTO public.alert_monitoring (signal_id, symbol, alert_type, target_price, priority_level)
SELECT 
  ta.id,
  ta.tradermade_symbol,
  'take_profit_2',
  ta.tp2,
  2
FROM public.trade_alerts ta
WHERE ta.status = 'active'
AND ta.tp2 IS NOT NULL
AND ta.id NOT IN (
  SELECT DISTINCT signal_id 
  FROM public.alert_monitoring 
  WHERE alert_type = 'take_profit_2'
);

-- Add TP3 monitoring
INSERT INTO public.alert_monitoring (signal_id, symbol, alert_type, target_price, priority_level)
SELECT 
  ta.id,
  ta.tradermade_symbol,
  'take_profit_3',
  ta.tp3,
  2
FROM public.trade_alerts ta
WHERE ta.status = 'active'
AND ta.tp3 IS NOT NULL
AND ta.id NOT IN (
  SELECT DISTINCT signal_id 
  FROM public.alert_monitoring 
  WHERE alert_type = 'take_profit_3'
);

-- Update RLS policies to allow system updates for price monitoring
-- Create a function to check if the operation is from a system context
CREATE OR REPLACE FUNCTION public.is_system_operation()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if the current user is performing system operations
  -- This allows automated price monitoring updates
  RETURN (
    current_setting('role', true) = 'service_role' OR
    current_setting('app.system_operation', true) = 'true' OR
    auth.uid() IS NULL -- Allow operations without authentication for system processes
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update trade_alerts RLS policy to allow system updates for price-triggered operations
DROP POLICY IF EXISTS "System can update alerts for price monitoring" ON public.trade_alerts;
CREATE POLICY "System can update alerts for price monitoring"
  ON public.trade_alerts
  FOR UPDATE
  USING (
    -- Allow system operations or educator/admin updates
    is_system_operation() OR
    (auth.uid() = user_id) OR
    has_role(auth.uid(), 'admin'::app_role) OR
    (EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND (access_level = ANY(ARRAY['admin'::access_level_enum, 'moderator'::access_level_enum]) 
           OR user_type = 'educator'::user_type_enum)
    ))
  )
  WITH CHECK (
    is_system_operation() OR
    (auth.uid() = user_id) OR
    has_role(auth.uid(), 'admin'::app_role) OR
    (EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND (access_level = ANY(ARRAY['admin'::access_level_enum, 'moderator'::access_level_enum]) 
           OR user_type = 'educator'::user_type_enum)
    ))
  );

-- Create function to safely update trade alerts from system operations
CREATE OR REPLACE FUNCTION public.system_update_trade_alert(
  p_signal_id UUID,
  p_status TEXT DEFAULT NULL,
  p_tp_hits INTEGER[] DEFAULT NULL,
  p_close_reason TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  -- Set system operation flag
  PERFORM set_config('app.system_operation', 'true', true);
  
  -- Update the trade alert
  UPDATE public.trade_alerts 
  SET 
    status = COALESCE(p_status, status),
    tp_hits = COALESCE(p_tp_hits, tp_hits),
    close_reason = COALESCE(p_close_reason, close_reason),
    updated_at = now()
  WHERE id = p_signal_id;
  
  -- Reset system operation flag
  PERFORM set_config('app.system_operation', 'false', true);
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;