-- Fix missing push_subscription_active column and other schema issues
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_subscription_active boolean DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onesignal_subscription_status text DEFAULT 'subscribed';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS xeon_stream_subscription boolean DEFAULT false;

-- Add missing indexes for better performance
CREATE INDEX IF NOT EXISTS idx_alert_monitoring_symbol_active ON alert_monitoring (symbol, is_active);
CREATE INDEX IF NOT EXISTS idx_trade_alerts_status ON trade_alerts (status);
CREATE INDEX IF NOT EXISTS idx_market_prices_symbol ON market_prices (symbol);

-- Create missing functions referenced in the code
CREATE OR REPLACE FUNCTION should_user_receive_notification(
  p_user_id uuid, 
  p_creator_id uuid, 
  p_notification_type text, 
  p_priority_level integer DEFAULT 1
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Basic notification eligibility check
  RETURN (
    p_user_id != p_creator_id AND -- Don't notify creator
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = p_user_id 
      AND account_status = 'active'
      AND push_subscription_active = true
    )
  );
END;
$$;

-- Create handle_triggered_alert function
CREATE OR REPLACE FUNCTION handle_triggered_alert(
  p_alert_id uuid,
  p_signal_id uuid,
  p_alert_type text,
  p_triggered_price numeric
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  tp_level integer;
BEGIN
  -- Deactivate the triggered alert
  UPDATE alert_monitoring 
  SET is_active = false, updated_at = now()
  WHERE id = p_alert_id;
  
  -- Handle different alert types
  IF p_alert_type = 'stop_loss' THEN
    -- Close the signal
    UPDATE trade_alerts 
    SET status = 'closed', close_reason = 'stop_loss', updated_at = now()
    WHERE id = p_signal_id;
    
    result := jsonb_build_object(
      'action', 'signal_closed',
      'reason', 'stop_loss_hit'
    );
    
  ELSIF p_alert_type LIKE 'take_profit_%' THEN
    -- Extract TP level
    tp_level := CAST(substring(p_alert_type from 'take_profit_(\d+)') AS integer);
    
    -- Add to tp_hits array
    UPDATE trade_alerts 
    SET tp_hits = COALESCE(tp_hits, '{}') || tp_level,
        updated_at = now()
    WHERE id = p_signal_id;
    
    result := jsonb_build_object(
      'action', 'tp_hit',
      'tp_level', tp_level
    );
    
  ELSE
    result := jsonb_build_object(
      'action', 'alert_processed',
      'alert_type', p_alert_type
    );
  END IF;
  
  RETURN result;
END;
$$;