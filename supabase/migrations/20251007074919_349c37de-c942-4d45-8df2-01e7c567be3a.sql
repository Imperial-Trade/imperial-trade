-- Final type cast fix for status field
CREATE OR REPLACE FUNCTION create_synthetic_test_signal(p_test_scenario TEXT DEFAULT 'basic_notification')
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user_id UUID;
  test_signal_id UUID;
BEGIN
  SELECT id INTO admin_user_id 
  FROM profiles 
  WHERE access_level = 'admin'
  LIMIT 1;

  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'No admin user found to create test signal';
  END IF;

  INSERT INTO trade_alerts (
    user_id,
    asset_name,
    tradermade_symbol,
    trade_type,
    entry_price,
    stop_loss,
    tp1,
    tp2,
    tp3,
    status,
    notes
  ) VALUES (
    admin_user_id,
    CASE p_test_scenario
      WHEN 'limit_order_test' THEN 'TEST_EUR/USD_LIMIT'
      WHEN 'tp_hit_test' THEN 'TEST_GBP/USD_TP'
      ELSE 'TEST_EUR/USD_BASIC'
    END,
    CASE p_test_scenario
      WHEN 'limit_order_test' THEN 'EURUSD'
      WHEN 'tp_hit_test' THEN 'GBPUSD'
      ELSE 'EURUSD'
    END,
    CASE p_test_scenario
      WHEN 'limit_order_test' THEN 'buy_limit'::trade_alert_type
      ELSE 'buy'::trade_alert_type
    END,
    1.10000,
    1.09500,
    1.10500,
    1.11000,
    1.11500,
    CASE p_test_scenario
      WHEN 'limit_order_test' THEN 'pending'::trade_alert_status
      ELSE 'active'::trade_alert_status
    END,
    '🧪 SYNTHETIC TEST - Created by Phoenix Plan validation - ' || now()::text
  )
  RETURNING id INTO test_signal_id;

  RETURN test_signal_id;
END;
$$;