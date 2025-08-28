
-- First, let's check the current trigger function and fix the return type mismatch
-- Drop the existing problematic trigger and function
DROP TRIGGER IF EXISTS handle_trade_alert_lifecycle_trigger ON trade_alerts;
DROP FUNCTION IF EXISTS handle_trade_alert_lifecycle();

-- Create a corrected trigger function that properly handles limit order status
CREATE OR REPLACE FUNCTION handle_trade_alert_lifecycle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Force limit orders to pending status regardless of input
  IF NEW.trade_type IN ('buy_limit', 'sell_limit') THEN
    NEW.status := 'pending';
    
    -- Set expiry for day orders (default 24 hours)
    IF NEW.expires_at IS NULL THEN
      NEW.expires_at := NEW.created_at + INTERVAL '24 hours';
    END IF;
    
    -- Log the status override for debugging
    INSERT INTO cron_job_logs (job_name, execution_time, records_affected, status, error_message)
    VALUES (
      'handle_trade_alert_lifecycle', 
      NOW(), 
      1, 
      'success',
      'Forced limit order to pending: ' || NEW.trade_type || ' - ' || NEW.asset_name || ' (ID: ' || NEW.id || ')'
    );
    
  -- Market orders remain active (or keep their intended status)
  ELSIF NEW.trade_type IN ('buy', 'sell') THEN
    -- If no status was explicitly set, default to active for market orders
    IF NEW.status IS NULL THEN
      NEW.status := 'active';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger on INSERT and UPDATE
CREATE TRIGGER handle_trade_alert_lifecycle_trigger
  BEFORE INSERT OR UPDATE ON trade_alerts
  FOR EACH ROW
  EXECUTE FUNCTION handle_trade_alert_lifecycle();

-- Add database constraint as safety net
ALTER TABLE trade_alerts 
DROP CONSTRAINT IF EXISTS check_limit_order_status;

ALTER TABLE trade_alerts 
ADD CONSTRAINT check_limit_order_status 
CHECK (
  (trade_type IN ('buy_limit', 'sell_limit') AND status = 'pending') OR
  (trade_type IN ('buy', 'sell'))
);

-- Update the default status to be more neutral
ALTER TABLE trade_alerts 
ALTER COLUMN status SET DEFAULT 'pending';
