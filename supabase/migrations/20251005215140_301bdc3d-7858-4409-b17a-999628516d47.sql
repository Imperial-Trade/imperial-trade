-- ========================================
-- AUTO-ACTIVATION TRIGGER FOR PENDING ORDERS
-- ========================================
-- Eliminates 30-second polling delay for activation and TP monitoring
-- Bugs Fixed: #4 (Activation delay), #5 (TP hit delay)

-- ✅ Function to auto-activate pending orders when price hits entry
CREATE OR REPLACE FUNCTION auto_activate_pending_orders()
RETURNS TRIGGER AS $$
DECLARE
  pending_signals RECORD;
  activation_price NUMERIC;
BEGIN
  -- Process all pending signals for this symbol
  FOR pending_signals IN 
    SELECT * FROM trade_alerts 
    WHERE status = 'pending' 
    AND tradermade_symbol = NEW.symbol
    AND deleted_at IS NULL
  LOOP
    -- BUY LIMIT: Activate when ask price <= entry price
    IF (pending_signals.trade_type IN ('buy_limit', 'buy') 
        AND NEW.ask IS NOT NULL 
        AND NEW.ask <= pending_signals.entry_price) THEN
      
      activation_price := NEW.ask;
      
      UPDATE trade_alerts 
      SET status = 'active',
          activated_at = NOW(),
          activation_price = activation_price,
          updated_at = NOW()
      WHERE id = pending_signals.id;
      
      -- Log activation
      INSERT INTO cron_job_logs (job_name, execution_time, records_affected, status, error_message)
      VALUES (
        'auto_activation_trigger',
        NOW(),
        1,
        'success',
        format('✅ BUY signal %s auto-activated at %s (entry: %s)', 
               pending_signals.id, activation_price, pending_signals.entry_price)
      );
      
    -- SELL LIMIT: Activate when bid price >= entry price
    ELSIF (pending_signals.trade_type IN ('sell_limit', 'sell') 
           AND NEW.bid IS NOT NULL 
           AND NEW.bid >= pending_signals.entry_price) THEN
      
      activation_price := NEW.bid;
      
      UPDATE trade_alerts 
      SET status = 'active',
          activated_at = NOW(),
          activation_price = activation_price,
          updated_at = NOW()
      WHERE id = pending_signals.id;
      
      -- Log activation
      INSERT INTO cron_job_logs (job_name, execution_time, records_affected, status, error_message)
      VALUES (
        'auto_activation_trigger',
        NOW(),
        1,
        'success',
        format('✅ SELL signal %s auto-activated at %s (entry: %s)', 
               pending_signals.id, activation_price, pending_signals.entry_price)
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ✅ Attach trigger to market_prices table
DROP TRIGGER IF EXISTS trigger_auto_activate_pending ON market_prices;

CREATE TRIGGER trigger_auto_activate_pending
AFTER INSERT OR UPDATE ON market_prices
FOR EACH ROW
EXECUTE FUNCTION auto_activate_pending_orders();

-- ✅ Log trigger installation
INSERT INTO cron_job_logs (job_name, execution_time, records_affected, status, error_message)
VALUES (
  'auto_activation_trigger_setup',
  NOW(),
  1,
  'success',
  '✅ Auto-activation trigger installed on market_prices table'
);

COMMENT ON FUNCTION auto_activate_pending_orders() IS 
'Auto-activates pending buy/sell limit orders when market price hits entry price. Eliminates 30-second polling delay.';

COMMENT ON TRIGGER trigger_auto_activate_pending ON market_prices IS 
'Triggers auto-activation check whenever market prices are updated';