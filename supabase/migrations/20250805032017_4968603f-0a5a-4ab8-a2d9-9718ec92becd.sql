-- Add enhanced limit order fields to trade_alerts table
ALTER TABLE public.trade_alerts ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;
ALTER TABLE public.trade_alerts ADD COLUMN IF NOT EXISTS expiry_type TEXT DEFAULT 'GTC';
ALTER TABLE public.trade_alerts ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE public.trade_alerts ADD COLUMN IF NOT EXISTS activation_price NUMERIC;

-- Create index for efficient pending order queries
CREATE INDEX IF NOT EXISTS idx_trade_alerts_pending_orders 
ON public.trade_alerts (status, trade_type, created_at) 
WHERE status = 'pending' AND trade_type IN ('buy_limit', 'sell_limit');

-- Create function to handle automatic order expiration
CREATE OR REPLACE FUNCTION public.expire_limit_orders()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_count INTEGER := 0;
BEGIN
  -- Update expired day orders to closed status
  UPDATE public.trade_alerts 
  SET 
    status = 'closed',
    close_reason = 'expired',
    updated_at = now()
  WHERE 
    status = 'pending' 
    AND expiry_type = 'DAY' 
    AND expires_at < now()
    AND trade_type IN ('buy_limit', 'sell_limit');
    
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  
  -- Log the expiration activity
  INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status)
  VALUES ('expire_limit_orders', NOW(), expired_count, 'success');
  
  RETURN expired_count;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
  VALUES ('expire_limit_orders', NOW(), 0, 'error', SQLERRM);
  
  RAISE;
END;
$$;

-- Create trigger to set activation timestamp when order becomes active
CREATE OR REPLACE FUNCTION public.set_activation_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Set activated_at when status changes from pending to active
  IF OLD.status = 'pending' AND NEW.status = 'active' THEN
    NEW.activated_at = now();
    -- Store the actual activation price
    NEW.activation_price = NEW.entry_price;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on trade_alerts for activation timestamp
DROP TRIGGER IF EXISTS trigger_set_activation_timestamp ON public.trade_alerts;
CREATE TRIGGER trigger_set_activation_timestamp
  BEFORE UPDATE ON public.trade_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_activation_timestamp();