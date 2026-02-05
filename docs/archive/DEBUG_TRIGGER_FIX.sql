-- EMERGENCY DEBUG: Find out why trigger isn't calling HTTP
-- This adds debug logging at key points

CREATE OR REPLACE FUNCTION public.enhanced_notification_pipeline_v2_debug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  change_types TEXT[] := '{}';
  is_significant_change BOOLEAN := false;
  test_array_length INTEGER;
BEGIN
  -- Log: Trigger fired
  INSERT INTO public.trigger_debug_log (signal_id, step, message, data)
  VALUES (NEW.id, '1_START', 'Trigger fired', jsonb_build_object('tg_op', TG_OP, 'trade_type', NEW.trade_type));

  -- INSERT logic
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.trigger_debug_log (signal_id, step, message)
    VALUES (NEW.id, '2_INSERT_BRANCH', 'Entered INSERT branch');
    
    IF NEW.trade_type IN ('buy_limit', 'sell_limit') THEN
      change_types := array_append(change_types, 'pending_limit_created');
    ELSE
      change_types := array_append(change_types, 'signal_created');
    END IF;
    
    is_significant_change := true;
    
    INSERT INTO public.trigger_debug_log (signal_id, step, message, data)
    VALUES (NEW.id, '3_AFTER_APPEND', 'After appending to change_types', 
            jsonb_build_object('change_types', change_types, 'is_significant', is_significant_change));
  END IF;

  -- Test array_length
  test_array_length := array_length(change_types, 1);
  
  INSERT INTO public.trigger_debug_log (signal_id, step, message, data)
  VALUES (NEW.id, '4_ARRAY_CHECK', 'Checking array length', 
          jsonb_build_object(
            'change_types', change_types,
            'array_length', test_array_length,
            'is_significant', is_significant_change,
            'would_return', (NOT is_significant_change OR test_array_length = 0 OR test_array_length IS NULL)
          ));

  -- The actual check from the trigger
  IF NOT is_significant_change OR array_length(change_types, 1) = 0 THEN
    INSERT INTO public.trigger_debug_log (signal_id, step, message)
    VALUES (NEW.id, '5_EARLY_RETURN', '❌ RETURNING EARLY - This is the bug!');
    RETURN NEW;
  END IF;

  INSERT INTO public.trigger_debug_log (signal_id, step, message)
  VALUES (NEW.id, '6_PASSED_CHECK', '✅ Passed the check - would call HTTP');

  RETURN NEW;
END;
$$;

-- Replace the trigger temporarily
DROP TRIGGER IF EXISTS trade_alert_notification_trigger ON public.trade_alerts;

CREATE TRIGGER trade_alert_notification_trigger
  AFTER INSERT OR UPDATE ON public.trade_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.enhanced_notification_pipeline_v2_debug();


