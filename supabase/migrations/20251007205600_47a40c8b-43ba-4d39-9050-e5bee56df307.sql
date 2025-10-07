-- ============================================
-- FIX: Boolean Cast Error Prevention for is_xeon_stream
-- ============================================
-- Problem: Empty strings "" being cast to boolean columns cause PostgreSQL errors
-- Solution: Database-level trigger to convert empty strings to NULL before INSERT/UPDATE

CREATE OR REPLACE FUNCTION public.prevent_empty_boolean_strings()
RETURNS TRIGGER AS $$
BEGIN
  -- Convert empty string to NULL for is_xeon_stream column
  IF NEW.is_xeon_stream IS NOT NULL AND NEW.is_xeon_stream::text = '' THEN
    NEW.is_xeon_stream := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for trade_alerts table
DROP TRIGGER IF EXISTS prevent_empty_booleans_trade_alerts ON public.trade_alerts;

CREATE TRIGGER prevent_empty_booleans_trade_alerts
BEFORE INSERT OR UPDATE ON public.trade_alerts
FOR EACH ROW
EXECUTE FUNCTION public.prevent_empty_boolean_strings();

-- Log the fix
INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
VALUES (
  'boolean_cast_error_prevention', 
  NOW(), 
  1, 
  'success',
  '✅ Added database trigger to prevent empty string boolean cast errors for is_xeon_stream column'
);