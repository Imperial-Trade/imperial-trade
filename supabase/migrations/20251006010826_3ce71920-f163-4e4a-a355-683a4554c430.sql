-- FIX BUG #20: Allow service role to activate limit orders (REVISED)
-- Drop all dependent triggers first, then recreate everything

-- Drop existing triggers (both variants)
DROP TRIGGER IF EXISTS prevent_active_trade_modifications_trigger ON public.trade_alerts;
DROP TRIGGER IF EXISTS trg_prevent_active_trade_mods ON public.trade_alerts;
DROP TRIGGER IF EXISTS trigger_prevent_active_mods ON public.trade_alerts;

-- Now drop and recreate the function
DROP FUNCTION IF EXISTS public.prevent_active_trade_modifications() CASCADE;

CREATE OR REPLACE FUNCTION public.prevent_active_trade_modifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Allow service role operations (used by edge functions for system automation)
  -- Service role has auth.uid() = NULL
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Admins bypass all restrictions
  IF has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- CRITICAL: Allow status change from 'pending' to 'active' for limit order activation
  -- This is a system-driven change, not user-driven, so it should be permitted
  IF OLD.status = 'pending' AND NEW.status = 'active' THEN
    RETURN NEW;
  END IF;

  -- Block modifications to active signals (by non-admins, non-service-role)
  IF (OLD.status = 'active' OR NEW.status = 'active') THEN
    IF (NEW.entry_price IS DISTINCT FROM OLD.entry_price)
       OR (NEW.stop_loss IS DISTINCT FROM OLD.stop_loss)
       OR (NEW.tp1 IS DISTINCT FROM OLD.tp1)
       OR (NEW.tp2 IS DISTINCT FROM OLD.tp2)
       OR (NEW.tp3 IS DISTINCT FROM OLD.tp3)
       OR (NEW.tp4 IS DISTINCT FROM OLD.tp4)
       OR (NEW.tp5 IS DISTINCT FROM OLD.tp5)
       OR (NEW.trade_type IS DISTINCT FROM OLD.trade_type)
       OR (NEW.asset_name IS DISTINCT FROM OLD.asset_name)
       OR (NEW.tradermade_symbol IS DISTINCT FROM OLD.tradermade_symbol) THEN
      RAISE EXCEPTION 'Modifying trade parameters for active signals is not allowed';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate the trigger with consistent naming
CREATE TRIGGER prevent_active_trade_modifications_trigger
BEFORE UPDATE ON public.trade_alerts
FOR EACH ROW
EXECUTE FUNCTION public.prevent_active_trade_modifications();

-- Log the fix
INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
VALUES (
  'bug_20_fix_deployment',
  NOW(),
  1,
  'success',
  'BUG #20 FIX: Modified prevent_active_trade_modifications() to allow service role and pending->active transitions'
);