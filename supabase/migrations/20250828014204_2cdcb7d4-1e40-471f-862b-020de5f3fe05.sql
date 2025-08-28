
-- Phase 1: Database Foundation - Create the missing trigger and constraint
-- This is the core fix that was never applied

-- First, create the trigger function to enforce limit order status
CREATE OR REPLACE FUNCTION handle_trade_alert_lifecycle()
RETURNS TRIGGER AS $$
BEGIN
    -- Force limit orders to be created as 'pending'
    IF NEW.trade_type IN ('buy_limit', 'sell_limit') AND TG_OP = 'INSERT' THEN
        NEW.status := 'pending';
        NEW.created_at := now();
        NEW.updated_at := now();
        
        -- Log the enforcement for debugging
        INSERT INTO cron_job_logs (job_name, execution_time, records_affected, status, error_message)
        VALUES (
            'limit_order_status_enforcement', 
            NOW(), 
            1, 
            'success', 
            'Limit order ' || NEW.trade_type || ' for ' || NEW.asset_name || ' forced to pending status'
        );
    END IF;
    
    -- Set activation timestamp when status changes from pending to active
    IF OLD.status = 'pending' AND NEW.status = 'active' AND TG_OP = 'UPDATE' THEN
        NEW.activated_at := now();
        NEW.updated_at := now();
        
        -- Log the activation
        INSERT INTO cron_job_logs (job_name, execution_time, records_affected, status, error_message)
        VALUES (
            'limit_order_activation', 
            NOW(), 
            1, 
            'success', 
            'Limit order ' || NEW.trade_type || ' for ' || NEW.asset_name || ' activated at price ' || COALESCE(NEW.activation_price::text, 'unknown')
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to trade_alerts table
DROP TRIGGER IF EXISTS trade_alert_lifecycle_trigger ON trade_alerts;
CREATE TRIGGER trade_alert_lifecycle_trigger
    BEFORE INSERT OR UPDATE ON trade_alerts
    FOR EACH ROW
    EXECUTE FUNCTION handle_trade_alert_lifecycle();

-- Create the constraint to prevent limit orders from being created as active
ALTER TABLE trade_alerts DROP CONSTRAINT IF EXISTS check_limit_order_status;
ALTER TABLE trade_alerts ADD CONSTRAINT check_limit_order_status 
CHECK (
    (trade_type IN ('buy_limit', 'sell_limit') AND status != 'active') OR 
    (trade_type NOT IN ('buy_limit', 'sell_limit'))
);

-- Phase 2: Retroactive Data Cleanup
-- Fix any existing limit orders that are in wrong states
UPDATE trade_alerts 
SET 
    status = 'pending',
    updated_at = now()
WHERE 
    trade_type IN ('buy_limit', 'sell_limit') 
    AND status IN ('active', 'closed')
    AND created_at > now() - interval '24 hours'  -- Only recent orders to avoid disrupting old completed trades
    AND close_reason IS NULL;  -- Don't change properly closed orders

-- Log the cleanup
INSERT INTO cron_job_logs (job_name, execution_time, records_affected, status, error_message)
VALUES (
    'limit_order_cleanup', 
    NOW(), 
    (SELECT COUNT(*) FROM trade_alerts WHERE trade_type IN ('buy_limit', 'sell_limit') AND status = 'pending'), 
    'success', 
    'Cleaned up existing limit orders - now have ' || (SELECT COUNT(*) FROM trade_alerts WHERE trade_type IN ('buy_limit', 'sell_limit') AND status = 'pending') || ' pending limit orders'
);

-- Add index for better performance on pending order queries
CREATE INDEX IF NOT EXISTS idx_trade_alerts_pending_limits 
ON trade_alerts (status, trade_type, created_at) 
WHERE status = 'pending' AND trade_type IN ('buy_limit', 'sell_limit');

-- Ensure alert_monitoring entries exist for all pending limit orders
INSERT INTO alert_monitoring (signal_id, symbol, alert_type, target_price, priority_level, is_active)
SELECT DISTINCT
    ta.id,
    ta.tradermade_symbol,
    'order_trigger',
    ta.entry_price,
    1,
    true
FROM trade_alerts ta
WHERE ta.status = 'pending' 
AND ta.trade_type IN ('buy_limit', 'sell_limit')
AND NOT EXISTS (
    SELECT 1 FROM alert_monitoring am 
    WHERE am.signal_id = ta.id AND am.alert_type = 'order_trigger'
)
ON CONFLICT (signal_id, alert_type) DO NOTHING;
