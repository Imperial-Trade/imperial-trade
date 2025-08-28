
-- Phase 1: Critical Database Logic Fixes

-- 1.1 Create the Missing Lifecycle Function
CREATE OR REPLACE FUNCTION public.handle_trade_alert_lifecycle()
RETURNS TRIGGER AS $$
DECLARE
    is_limit_order BOOLEAN;
BEGIN
    -- Determine if this is a limit order
    is_limit_order := (NEW.trade_type IN ('buy_limit', 'sell_limit'));
    
    -- Handle INSERT operations
    IF TG_OP = 'INSERT' THEN
        -- CRITICAL FIX: Force limit orders to 'pending' status
        IF is_limit_order THEN
            NEW.status := 'pending';
            INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
            VALUES ('handle_trade_alert_lifecycle', NOW(), 1, 'success', 
                   'Limit order ' || NEW.id || ' (' || NEW.asset_name || ') forced to pending status');
        ELSE
            -- Market orders should be active if no status provided
            IF NEW.status IS NULL THEN
                NEW.status := 'active';
            END IF;
        END IF;
        
        -- Set user_id if not provided
        IF NEW.user_id IS NULL THEN
            NEW.user_id := auth.uid();
        END IF;
        
        RETURN NEW;
    END IF;
    
    -- Handle UPDATE operations
    IF TG_OP = 'UPDATE' THEN
        -- Handle pending → active transitions (order activation)
        IF OLD.status = 'pending' AND NEW.status = 'active' THEN
            NEW.activated_at := now();
            NEW.activation_price := NEW.entry_price;
            
            INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
            VALUES ('handle_trade_alert_lifecycle', NOW(), 1, 'success', 
                   'Signal ' || NEW.id || ' (' || NEW.asset_name || ') activated at price ' || NEW.entry_price);
        END IF;
        
        -- Handle signal closure or cancellation
        IF NEW.status IN ('closed', 'cancelled') AND OLD.status NOT IN ('closed', 'cancelled') THEN
            -- Deactivate all monitoring for this signal
            UPDATE public.alert_monitoring 
            SET is_active = false, updated_at = now()
            WHERE signal_id = NEW.id;
            
            INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
            VALUES ('handle_trade_alert_lifecycle', NOW(), 1, 'success', 
                   'Signal ' || NEW.id || ' (' || NEW.asset_name || ') ' || NEW.status || ' - monitoring deactivated');
        END IF;
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1.2 Clean Up Trigger Chaos - Drop all existing duplicate triggers
DROP TRIGGER IF EXISTS trg_handle_trade_alert_lifecycle ON public.trade_alerts;
DROP TRIGGER IF EXISTS trg_create_alert_monitoring_entries ON public.trade_alerts;
DROP TRIGGER IF EXISTS trg_deactivate_alert_monitoring ON public.trade_alerts;
DROP TRIGGER IF EXISTS trg_set_activation_timestamp ON public.trade_alerts;
DROP TRIGGER IF EXISTS trg_set_trade_alert_user_id ON public.trade_alerts;
DROP TRIGGER IF EXISTS trg_prevent_active_trade_modifications ON public.trade_alerts;
DROP TRIGGER IF EXISTS trg_auto_notify_signal_changes ON public.trade_alerts;
DROP TRIGGER IF EXISTS trg_auto_notify_signal_creation ON public.trade_alerts;
DROP TRIGGER IF EXISTS trg_notify_trade_alert_changes ON public.trade_alerts;

-- Create the single consolidated lifecycle trigger
CREATE TRIGGER trg_handle_trade_alert_lifecycle
    BEFORE INSERT OR UPDATE ON public.trade_alerts
    FOR EACH ROW EXECUTE FUNCTION public.handle_trade_alert_lifecycle();

-- Re-create essential triggers (keeping only one of each type)
CREATE TRIGGER trg_create_alert_monitoring_entries
    AFTER INSERT ON public.trade_alerts
    FOR EACH ROW
    WHEN (NEW.status = 'active')
    EXECUTE FUNCTION public.create_alert_monitoring_entries();

CREATE TRIGGER trg_prevent_active_trade_modifications
    BEFORE UPDATE ON public.trade_alerts
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_active_trade_modifications();

CREATE TRIGGER trg_auto_notify_signal_changes
    AFTER INSERT OR UPDATE ON public.trade_alerts
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_notify_signal_changes();

-- 1.3 Fix TP Closure Logic in handle_triggered_alert_enhanced
CREATE OR REPLACE FUNCTION public.handle_triggered_alert_enhanced(p_alert_id uuid, p_signal_id uuid, p_alert_type text, p_triggered_price numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
            -- All TPs hit - close the signal with 'all_tps_hit'
            UPDATE trade_alerts 
            SET tp_hits = current_tp_hits,
                status = 'closed',
                close_reason = 'all_tps_hit',
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
$$;

-- 1.4 Add Missing Enum Values
-- Add 'cancelled' to trade_alert_status enum if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'cancelled' 
        AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'trade_alert_status'
        )
    ) THEN
        ALTER TYPE trade_alert_status ADD VALUE 'cancelled';
    END IF;
END $$;

-- Add 'all_tps_hit' to close_reason enum if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'all_tps_hit' 
        AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'close_reason'
        )
    ) THEN
        ALTER TYPE close_reason ADD VALUE 'all_tps_hit';
    END IF;
END $$;

-- 1.5 Historical Data Cleanup
-- Convert any incorrectly closed limit orders back to pending
UPDATE public.trade_alerts 
SET status = 'pending', updated_at = now()
WHERE trade_type IN ('buy_limit', 'sell_limit') 
  AND status = 'closed' 
  AND close_reason IS NULL 
  AND created_at > NOW() - INTERVAL '1 day';

-- Clean up orphaned alert monitoring entries
UPDATE public.alert_monitoring 
SET is_active = false, updated_at = now()
WHERE signal_id IN (
    SELECT id FROM trade_alerts 
    WHERE status IN ('closed', 'cancelled')
) AND is_active = true;

-- Add comprehensive logging
INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
VALUES (
    'trade_alert_lifecycle_migration', 
    NOW(), 
    1, 
    'success',
    'Critical database fixes applied: lifecycle function created, triggers consolidated, TP closure fixed, enum values added, historical data cleaned'
);
