-- Layer 1: Database-Level Protection for is_xeon_stream boolean field
-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS sanitize_boolean_fields_before_update ON trade_alerts;
DROP FUNCTION IF EXISTS sanitize_boolean_fields_before_update();

-- Create trigger function that sanitizes BEFORE PostgreSQL validates types
CREATE OR REPLACE FUNCTION sanitize_boolean_fields_before_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Convert empty string to NULL for is_xeon_stream BEFORE type validation
  IF NEW.is_xeon_stream IS NOT NULL AND NEW.is_xeon_stream::text = '' THEN
    NEW.is_xeon_stream := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger that fires BEFORE UPDATE (prevents 22P02 error)
CREATE TRIGGER sanitize_boolean_fields_before_update
  BEFORE UPDATE ON trade_alerts
  FOR EACH ROW
  EXECUTE FUNCTION sanitize_boolean_fields_before_update();