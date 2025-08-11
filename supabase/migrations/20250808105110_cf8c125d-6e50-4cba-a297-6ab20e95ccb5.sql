-- Enable RLS on trade_alerts (idempotent)
ALTER TABLE public.trade_alerts ENABLE ROW LEVEL SECURITY;

-- Allow owners to update their own alerts (with trigger guardrails)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'trade_alerts' AND policyname = 'Users can update their own alerts'
  ) THEN
    CREATE POLICY "Users can update their own alerts"
    ON public.trade_alerts
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Allow admins to update any alerts
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'trade_alerts' AND policyname = 'Admins can update all alerts'
  ) THEN
    CREATE POLICY "Admins can update all alerts"
    ON public.trade_alerts
    FOR UPDATE
    USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Guardrail: prevent parameter edits on ACTIVE signals by non-admins (notes are allowed)
CREATE OR REPLACE FUNCTION public.prevent_active_trade_modifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Admins bypass restrictions
  IF has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- If the signal is active (stays or is currently active), block parameter edits
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
$function$;

-- Attach trigger (idempotent)
DROP TRIGGER IF EXISTS trg_prevent_active_trade_mods ON public.trade_alerts;
CREATE TRIGGER trg_prevent_active_trade_mods
BEFORE UPDATE ON public.trade_alerts
FOR EACH ROW
EXECUTE FUNCTION public.prevent_active_trade_modifications();