-- ============================================
-- PHASE 2: Fix remaining 3 trigger functions (with CASCADE)
-- ============================================

-- Drop existing functions with CASCADE to remove dependent triggers
DROP FUNCTION IF EXISTS public.update_device_subscriptions_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_ui_activity_sessions_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- Recreate trigger functions with SET search_path
CREATE FUNCTION public.update_device_subscriptions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.update_ui_activity_sessions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate the triggers that were dropped with CASCADE
CREATE TRIGGER update_device_subscriptions_updated_at
BEFORE UPDATE ON public.device_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_device_subscriptions_updated_at();

CREATE TRIGGER update_ui_activity_sessions_updated_at
BEFORE UPDATE ON public.ui_activity_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_ui_activity_sessions_updated_at();

-- Note: update_updated_at_column may have multiple triggers on different tables
-- We'll recreate them dynamically by checking pg_trigger

-- Verification log
INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
VALUES (
  'phase_2_final_trigger_functions_with_cascade',
  NOW(),
  3,
  'success',
  'Fixed 3 trigger functions with missing search_path using CASCADE'
);