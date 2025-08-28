
-- Step 1: Clean up duplicate and conflicting triggers on trade_alerts table
-- Remove duplicate notification triggers (keep only the most comprehensive one)
DROP TRIGGER IF EXISTS notify_trade_alert_changes ON public.trade_alerts;

-- Remove old/duplicate monitoring creation triggers
DROP TRIGGER IF EXISTS create_alert_monitoring_entries ON public.trade_alerts;

-- Remove duplicate deactivation triggers  
DROP TRIGGER IF EXISTS deactivate_alert_monitoring ON public.trade_alerts;

-- Remove duplicate activation timestamp triggers
DROP TRIGGER IF EXISTS set_activation_timestamp ON public.trade_alerts;

-- Remove any other conflicting triggers that might modify status
DROP TRIGGER IF EXISTS auto_notify_signal_creation ON public.trade_alerts;
DROP TRIGGER IF EXISTS auto_notify_signal_changes ON public.trade_alerts;

-- Step 2: Create a single, comprehensive trigger that handles all operations in correct order
CREATE OR REPLACE FUNCTION public.handle_trade_alert_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    is_limit_order boolean;
    should_create_monitoring boolean;
BEGIN
    -- Determine if this is a limit order
    is_limit_order := (NEW.trade_type IN ('buy_limit', 'sell_limit'));
    
    -- Step 2a: CRITICAL - Prevent limit orders from being created as active
    IF TG_OP = 'INSERT' THEN
        -- Force limit orders to be pending, regardless of what was submitted
        IF is_limit_order AND NEW.status != 'pending' THEN
            NEW.status := 'pending';
            
            -- Log this status correction for debugging
            INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
            VALUES (
                'limit_order_status_correction', 
                NOW(), 
                1, 
                'warning',
                'CORRECTED: ' || NEW.trade_type || ' order for ' || NEW.asset_name || 
                ' attempted creation with status: active, forced to pending'
            );
        END IF;
        
        -- Log creation for debugging
        INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
        VALUES (
            'trade_alert_creation', 
            NOW(), 
            1, 
            'success',
            'CREATED: ' || NEW.trade_type || ' order for ' || NEW.asset_name || 
            ' with status: ' || NEW.status || ' (ID: ' || NEW.id || ')'
        );
        
        -- Create alert monitoring entries for active signals only
        should_create_monitoring := (NEW.status = 'active');
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle status transitions
        IF OLD.status != NEW.status THEN
            -- Log status changes
            INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
            VALUES (
                'trade_alert_status_change', 
                NOW(), 
                1, 
                'success',
                'STATUS CHANGE: ' || NEW.asset_name || ' (' || NEW.trade_type || ') ' ||
                OLD.status || ' → ' || NEW.status || ' (ID: ' || NEW.id || ')'
            );
            
            -- Set activation timestamp when transitioning from pending to active
            IF OLD.status = 'pending' AND NEW.status = 'active' THEN
                NEW.activated_at := now();
                NEW.activation_price := NEW.entry_price;
                
                -- Create monitoring entries when becoming active
                should_create_monitoring := true;
                
                -- Log activation
                INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
                VALUES (
                    'trade_alert_activation', 
                    NOW(), 
                    1, 
                    'success',
                    'ACTIVATED: ' || NEW.asset_name || ' (' || NEW.trade_type || ') at price ' || 
                    NEW.activation_price || ' (ID: ' || NEW.id || ')'
                );
            END IF;
            
            -- Deactivate monitoring when closing
            IF NEW.status = 'closed' AND OLD.status != 'closed' THEN
                UPDATE public.alert_monitoring 
                SET is_active = false, updated_at = now()
                WHERE signal_id = NEW.id;
            END IF;
        END IF;
    END IF;
    
    -- Step 2b: Create alert monitoring entries (only for active signals)
    IF should_create_monitoring THEN
        -- Create stop loss monitoring
        INSERT INTO public.alert_monitoring (signal_id, symbol, alert_type, target_price, priority_order)
        VALUES (NEW.id, NEW.tradermade_symbol, 'stop_loss', NEW.stop_loss, 1)
        ON CONFLICT (signal_id, alert_type) DO NOTHING;
        
        -- Create take profit monitoring entries
        IF NEW.tp1 IS NOT NULL THEN
            INSERT INTO public.alert_monitoring (signal_id, symbol, alert_type, target_price, priority_order)
            VALUES (NEW.id, NEW.tradermade_symbol, 'take_profit_1', NEW.tp1, 2)
            ON CONFLICT (signal_id, alert_type) DO NOTHING;
        END IF;
        
        IF NEW.tp2 IS NOT NULL THEN
            INSERT INTO public.alert_monitoring (signal_id, symbol, alert_type, target_price, priority_order)
            VALUES (NEW.id, NEW.tradermade_symbol, 'take_profit_2', NEW.tp2, 2)
            ON CONFLICT (signal_id, alert_type) DO NOTHING;
        END IF;
        
        IF NEW.tp3 IS NOT NULL THEN
            INSERT INTO public.alert_monitoring (signal_id, symbol, alert_type, target_price, priority_order)
            VALUES (NEW.id, NEW.tradermade_symbol, 'take_profit_3', NEW.tp3, 2)
            ON CONFLICT (signal_id, alert_type) DO NOTHING;
        END IF;
        
        IF NEW.tp4 IS NOT NULL THEN
            INSERT INTO public.alert_monitoring (signal_id, symbol, alert_type, target_price, priority_order)
            VALUES (NEW.id, NEW.tradermade_symbol, 'take_profit_4', NEW.tp4, 2)
            ON CONFLICT (signal_id, alert_type) DO NOTHING;
        END IF;
        
        IF NEW.tp5 IS NOT NULL THEN
            INSERT INTO public.alert_monitoring (signal_id, symbol, alert_type, target_price, priority_order)
            VALUES (NEW.id, NEW.tradermade_symbol, 'take_profit_5', NEW.tp5, 2)
            ON CONFLICT (signal_id, alert_type) DO NOTHING;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Step 3: Create the single trigger that replaces all the others
CREATE TRIGGER handle_trade_alert_lifecycle
    BEFORE INSERT OR UPDATE ON public.trade_alerts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_trade_alert_lifecycle();

-- Step 4: Create a constraint to prevent limit orders from being active at creation
ALTER TABLE public.trade_alerts 
ADD CONSTRAINT check_limit_order_status 
CHECK (
    (trade_type IN ('buy_limit', 'sell_limit') AND status = 'pending') OR 
    (trade_type NOT IN ('buy_limit', 'sell_limit'))
);

-- Step 5: Add a monitoring function to detect race conditions
CREATE OR REPLACE FUNCTION public.detect_race_conditions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    suspicious_count integer;
BEGIN
    -- Find limit orders that became active without proper activation data
    SELECT COUNT(*) INTO suspicious_count
    FROM public.trade_alerts
    WHERE trade_type IN ('buy_limit', 'sell_limit')
    AND status IN ('active', 'closed')
    AND (activated_at IS NULL OR activation_price IS NULL);
    
    IF suspicious_count > 0 THEN
        INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
        VALUES (
            'race_condition_detection', 
            NOW(), 
            suspicious_count, 
            'warning',
            'DETECTED: ' || suspicious_count || ' limit orders with suspicious activation states'
        );
    END IF;
END;
$function$;

-- Step 6: Clean up any existing problematic records (optional - run with caution)
-- Update any existing limit orders that are in an inconsistent state
UPDATE public.trade_alerts 
SET status = 'pending', 
    activated_at = NULL, 
    activation_price = NULL,
    close_reason = NULL
WHERE trade_type IN ('buy_limit', 'sell_limit')
AND status = 'closed'
AND activated_at IS NULL
AND activation_price IS NULL;
