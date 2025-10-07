-- Fix #1: Rewrite set_activation_timestamp trigger to ONLY run on UPDATE
CREATE OR REPLACE FUNCTION public.set_activation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- ONLY RUN ON UPDATE OPERATIONS (not INSERT)
  IF TG_OP = 'UPDATE' THEN
    -- Set activated_at when status changes from pending to active
    IF OLD.status = 'pending' AND NEW.status = 'active' THEN
      NEW.activated_at = now();
      NEW.activation_price = NEW.entry_price;
    END IF;
    
    -- CRITICAL: Prevent status reversion from active back to pending after activation
    IF OLD.status = 'active' AND NEW.status = 'pending' AND OLD.activated_at IS NOT NULL THEN
      RAISE EXCEPTION 'Cannot revert signal status from active to pending after activation';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Fix #1B: Clean up ALL existing limit orders that don't have activated_at
-- This fixes historical data where activated_at wasn't tracked properly
UPDATE public.trade_alerts
SET activated_at = created_at,
    activation_price = entry_price
WHERE trade_type IN ('buy_limit', 'sell_limit')
  AND status != 'pending'
  AND activated_at IS NULL;

-- Fix #1C: Add constraint to ensure limit orders start as pending
ALTER TABLE public.trade_alerts
DROP CONSTRAINT IF EXISTS limit_orders_start_pending;

ALTER TABLE public.trade_alerts
ADD CONSTRAINT limit_orders_start_pending
CHECK (
  (trade_type IN ('buy_limit', 'sell_limit') AND 
   (status = 'pending' OR activated_at IS NOT NULL)) OR
  (trade_type NOT IN ('buy_limit', 'sell_limit'))
);

-- Fix #4: Reduce circuit breaker cooldown from 5 minutes to 1 minute
CREATE OR REPLACE FUNCTION public.check_notification_circuit_breaker(
    p_signal_id uuid,
    p_user_id uuid,
    p_cooldown_minutes integer DEFAULT 1
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    last_sent_at timestamp with time zone;
    should_send boolean := true;
BEGIN
    -- Check if notification was sent recently
    SELECT last_notification_at INTO last_sent_at
    FROM notification_circuit_breaker
    WHERE signal_id = p_signal_id 
    AND user_id = p_user_id;
    
    -- If record exists, check cooldown
    IF last_sent_at IS NOT NULL THEN
        IF last_sent_at > now() - (p_cooldown_minutes || ' minutes')::interval THEN
            should_send := false;
            
            -- Log the blocked notification
            INSERT INTO cron_job_logs (job_name, execution_time, records_affected, status, error_message)
            VALUES (
                'notification_circuit_breaker', 
                now(), 
                0, 
                'blocked',
                format('Blocked duplicate notification - Signal: %s, User: %s, Last sent: %s ago', 
                    p_signal_id, p_user_id, 
                    age(now(), last_sent_at))
            );
        ELSE
            -- Update existing record
            UPDATE notification_circuit_breaker 
            SET last_notification_at = now(),
                notification_count = notification_count + 1
            WHERE signal_id = p_signal_id AND user_id = p_user_id;
        END IF;
    ELSE
        -- Create new record
        INSERT INTO notification_circuit_breaker (signal_id, user_id, last_notification_at, notification_count)
        VALUES (p_signal_id, p_user_id, now(), 1)
        ON CONFLICT (signal_id, user_id) DO UPDATE SET
            last_notification_at = now(),
            notification_count = notification_circuit_breaker.notification_count + 1;
    END IF;
    
    RETURN should_send;
END;
$function$;