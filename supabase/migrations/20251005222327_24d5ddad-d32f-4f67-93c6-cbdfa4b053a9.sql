-- Fix security warning for log_trigger_execution function
-- Add search_path to make it secure

CREATE OR REPLACE FUNCTION log_trigger_execution()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.trigger_execution_log (trigger_name, signal_id, trigger_operation)
  VALUES (TG_NAME, NEW.id, TG_OP);
  RETURN NEW;
END;
$$;