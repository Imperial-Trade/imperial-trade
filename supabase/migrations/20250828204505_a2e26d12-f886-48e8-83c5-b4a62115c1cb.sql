
-- Phase 1: Critical Database Logic Fixes

-- Step 1: Create the missing handle_trade_alert_lifecycle function
CREATE OR REPLACE FUNCTION public.handle_trade_alert_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    is_limit_order BOOLEAN := false;
    should_create_monitoring BOOLEAN := false;
BEGIN
    -- Determine if this is a limit order
    is_limit_order := (NEW.trade_type IN ('buy_limit', 'sell_limit'));
    
    IF TG_OP = 'INSERT' THEN
        -- CRITICAL FIX: Force limit orders to pending status
        IF is_limit_order THEN
            -- Override any incoming status for limit orders
            NEW.status := 'pending';
            
            -- Log this correction for debugging
            INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
            VALUES (
                'limit_order_status_correction', 
                NOW(), 
                1, 
                'info',
                'CORRECTED: ' || NEW.trade_type || ' order for ' || NEW.asset_name || 
                ' forced to pending status (ID: ' || NEW.id || ')'
            );
        ELSE
            -- Market orders should be active by default
            IF NEW.status IS NULL THEN
                NEW.status := 'active';
            END IF;
        END IF;
        
        -- Only create monitoring for active signals
        should_create_monitoring := (NEW.status = 'active');
        
        RETURN NEW;
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle status transitions
        IF OLD.status = 'pending' AND NEW.status = 'active' THEN
            -- Limit order activation
            NEW.activated_at := now();
            NEW.activation_price := NEW.entry_price;
            
            -- Log activation
            INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
            VALUES (
                'limit_order_activation', 
                NOW(), 
                1, 
                'info',
                'ACTIVATED: ' || NEW.trade_type || ' order for ' || NEW.asset_name || 
                ' at price ' || NEW.activation_price || ' (ID: ' || NEW.id || ')'
            );
        END IF;
        
        -- Deactivate monitoring when signal is closed or cancelled
        IF NEW.status IN ('closed', 'cancelled') AND OLD.status NOT IN ('closed', 'cancelled') THEN
            UPDATE public.alert_monitoring 
            SET is_active = false, updated_at = now()
            WHERE signal_id = NEW.id;
            
            -- Log closure/cancellation
            INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
            VALUES (
                'signal_closure', 
                NOW(), 
                1, 
                'info',
                'CLOSED: ' || NEW.trade_type || ' signal for ' || NEW.asset_name || 
                ' with reason: ' || COALESCE(NEW.close_reason::text, 'none') || ' (ID: ' || NEW.id || ')'
            );
        END IF;
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$function$;

-- Step 2: Drop all existing duplicate triggers to clean up
DROP TRIGGER IF EXISTS trg_handle_trade_alert_lifecycle ON public.trade_alerts;
DROP TRIGGER IF EXISTS set_activation_timestamp ON public.trade_alerts;
DROP TRIGGER IF EXISTS create_alert_monitoring_entries ON public.trade_alerts;
DROP TRIGGER IF EXISTS prevent_active_trade_modifications ON public.trade_alerts;
DROP TRIGGER IF EXISTS set_trade_alert_user_id ON public.trade_alerts;
DROP TRIGGER IF EXISTS auto_notify_signal_creation ON public.trade_alerts;
DROP TRIGGER IF EXISTS auto_notify_signal_changes ON public.trade_alerts;
DROP TRIGGER IF EXISTS notify_trade_alert_changes ON public.trade_alerts;

-- Step 3: Create the main lifecycle trigger (BEFORE INSERT OR UPDATE)
CREATE TRIGGER trg_handle_trade_alert_lifecycle
    BEFORE INSERT OR UPDATE ON public.trade_alerts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_trade_alert_lifecycle();

-- Step 4: Re-create essential triggers (keeping only one of each type)
CREATE TRIGGER trg_create_alert_monitoring_entries
    AFTER INSERT ON public.trade_alerts
    FOR EACH ROW
    WHEN (NEW.status = 'active')
    EXECUTE FUNCTION public.create_alert_monitoring_entries();

CREATE TRIGGER trg_prevent_active_trade_modifications
    BEFORE UPDATE ON public.trade_alerts
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_active_trade_modifications();

CREATE TRIGGER trg_set_trade_alert_user_id
    BEFORE INSERT ON public.trade_alerts
    FOR EACH ROW
    EXECUTE FUNCTION public.set_trade_alert_user_id();

-- Keep only ONE notification trigger to prevent spam
CREATE TRIGGER trg_auto_notify_signal_changes
    AFTER INSERT OR UPDATE ON public.trade_alerts
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_notify_signal_changes();

-- Step 5: Fix TP closure logic in handle_triggered_alert_enhanced
CREATE OR REPLACE FUNCTION public.handle_triggered_alert_enhanced(p_alert_id uuid, p_signal_id uuid, p_alert_type text, p_triggered_price numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    result jsonb;
    tp_level integer;
    current_tp_hits integer[];
    total_tp_levels integer := 0;
    signal_record RECORD;
BEGIN
    -- Get current signal state
    SELECT * INTO signal_record 
    FROM trade_alerts 
    WHERE id = p_signal_id;
    
    -- Count total TP levels for this signal
    SELECT 
        CASE WHEN tp1 IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN tp2 IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN tp3 IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN tp4 IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN tp5 IS NOT NULL THEN 1 ELSE 0 END
    INTO total_tp_levels
    FROM trade_alerts 
    WHERE id = p_signal_id;
    
    -- Deactivate the triggered alert
    UPDATE alert_monitoring 
    SET is_active = false, 
        simultaneous_trigger_handled = true,
        updated_at = now()
    WHERE id = p_alert_id;
    
    -- Handle different alert types
    IF p_alert_type = 'stop_loss' THEN
        -- Close the signal immediately - SL has priority
        UPDATE trade_alerts 
        SET status = 'closed', 
            close_reason = 'stop_loss', 
            updated_at = now()
        WHERE id = p_signal_id;
        
        -- Deactivate ALL remaining alerts for this signal
        UPDATE alert_monitoring 
        SET is_active = false, updated_at = now()
        WHERE signal_id = p_signal_id AND is_active = true;
        
        result := jsonb_build_object(
            'action', 'signal_closed',
            'reason', 'stop_loss_hit',
            'triggered_price', p_triggered_price
        );
        
    ELSIF p_alert_type LIKE 'take_profit_%' THEN
        -- Extract TP level
        tp_level := CAST(substring(p_alert_type from 'take_profit_(\d+)') AS integer);
        current_tp_hits := COALESCE(signal_record.tp_hits, ARRAY[]::integer[]);
        
        -- Add to tp_hits array if not already present
        IF NOT (tp_level = ANY(current_tp_hits)) THEN
            current_tp_hits := array_append(current_tp_hits, tp_level);
        END IF;
        
        -- CRITICAL FIX: Check if this is the final TP or all TPs are now hit
        IF array_length(current_tp_hits, 1) >= total_tp_levels THEN
            -- All TPs hit - close the signal with 'all_tps_hit' reason
            UPDATE trade_alerts 
            SET tp_hits = current_tp_hits,
                status = 'closed',
                close_reason = 'all_tps_hit', -- FIXED: Use 'all_tps_hit' instead of individual TP
                updated_at = now()
            WHERE id = p_signal_id;
            
            -- Deactivate remaining alerts
            UPDATE alert_monitoring 
            SET is_active = false, updated_at = now()
            WHERE signal_id = p_signal_id AND is_active = true;
            
            result := jsonb_build_object(
                'action', 'signal_closed',
                'reason', 'all_tps_hit',
                'tp_level', tp_level,
                'total_tps_hit', array_length(current_tp_hits, 1),
                'triggered_price', p_triggered_price
            );
        ELSE
            -- Partial TP hit - update status to partially_profited
            UPDATE trade_alerts 
            SET tp_hits = current_tp_hits,
                status = 'partially_profited',
                updated_at = now()
            WHERE id = p_signal_id;
            
            result := jsonb_build_object(
                'action', 'tp_partial_hit',
                'tp_level', tp_level,
                'total_tps_hit', array_length(current_tp_hits, 1),
                'remaining_tps', total_tp_levels - array_length(current_tp_hits, 1),
                'triggered_price', p_triggered_price
            );
        END IF;
        
    ELSE
        result := jsonb_build_object(
            'action', 'alert_processed',
            'alert_type', p_alert_type,
            'triggered_price', p_triggered_price
        );
    END IF;
    
    RETURN result;
END;
$function$;

-- Step 6: Add 'all_tps_hit' to close_reason enum if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'all_tps_hit' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'close_reason')) THEN
        ALTER TYPE close_reason ADD VALUE 'all_tps_hit';
    END IF;
END $$;

-- Step 7: Add 'cancelled' status to trade alert status enum if not exists  
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'cancelled' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'trade_alert_status')) THEN
        ALTER TYPE trade_alert_status ADD VALUE 'cancelled';
    END IF;
END $$;

-- Step 8: Update any existing incorrectly closed limit orders to pending
UPDATE public.trade_alerts 
SET status = 'pending', updated_at = now()
WHERE trade_type IN ('buy_limit', 'sell_limit') 
  AND status = 'closed' 
  AND close_reason IS NULL
  AND created_at > NOW() - INTERVAL '1 day'; -- Only recent ones to be safe

-- Log the cleanup
INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
VALUES (
    'limit_order_cleanup', 
    NOW(), 
    (SELECT COUNT(*) FROM public.trade_alerts WHERE trade_type IN ('buy_limit', 'sell_limit') AND status = 'pending' AND updated_at > NOW() - INTERVAL '1 minute'), 
    'success',
    'Cleaned up incorrectly closed limit orders - converted to pending status'
);
