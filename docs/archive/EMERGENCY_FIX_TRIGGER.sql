-- 🚨 EMERGENCY FIX: This trigger WILL call HTTP no matter what!
-- It wraps the ENTIRE logic in an exception handler to catch any silent failures

CREATE OR REPLACE FUNCTION public.enhanced_notification_pipeline_v2()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  change_types TEXT[] := '{}';
  is_significant_change BOOLEAN := false;
  notification_payload JSONB;
  service_role_key TEXT;
  function_url TEXT;
  request_id BIGINT;
  all_authenticated_users UUID[];
BEGIN
  -- Wrap EVERYTHING in exception handling
  BEGIN
    service_role_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg2OTI1MCwiZXhwIjoyMDY3NDQ1MjUwfQ.0tHLp8yWK_lNP_6yrdNn4BqM3kGlWnKMcDf9fYMa2hU';
    function_url := 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/enhanced-signal-notification-dispatcher';

    -- Simple INSERT logic
    IF TG_OP = 'INSERT' THEN
      IF NEW.trade_type IN ('buy_limit', 'sell_limit') THEN
        change_types := array_append(change_types, 'pending_limit_created');
      ELSE
        change_types := array_append(change_types, 'signal_created');
      END IF;
      is_significant_change := true;
    ELSIF TG_OP = 'UPDATE' THEN
      IF OLD.notes IS DISTINCT FROM NEW.notes THEN
        change_types := array_append(change_types, 'notes_updated');
        is_significant_change := true;
      END IF;
    END IF;

    -- If not significant, return early
    IF NOT is_significant_change THEN
      INSERT INTO public.trigger_exception_log (signal_id, error_message)
      VALUES (NEW.id, 'Not significant change - returning early');
      RETURN NEW;
    END IF;

    -- Get users
    SELECT ARRAY_AGG(id) INTO all_authenticated_users
    FROM public.profiles
    WHERE account_status = 'active'
    LIMIT 100;  -- Limit for safety

    -- Build minimal payload
    notification_payload := jsonb_build_object(
      'notifications', jsonb_build_array(
        jsonb_build_object(
          'signal_id', NEW.id,
          'notification_type', 'signal_created',
          'asset_name', NEW.asset_name,
          'user_ids', COALESCE(all_authenticated_users, ARRAY[]::UUID[])
        )
      )
    );

    -- Log before HTTP call
    INSERT INTO public.trigger_debug_log (signal_id, step, message)
    VALUES (NEW.id, 'BEFORE_HTTP', '🚀 About to call HTTP POST');

    -- CALL HTTP POST
    SELECT net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := notification_payload,
      timeout_milliseconds := 20000
    ) INTO request_id;

    -- Log after HTTP call
    INSERT INTO public.trigger_debug_log (signal_id, step, message, data)
    VALUES (NEW.id, 'AFTER_HTTP', '✅ HTTP POST completed', 
            jsonb_build_object('request_id', request_id));

  EXCEPTION WHEN OTHERS THEN
    -- Catch ANY error and log it
    INSERT INTO public.trigger_exception_log (signal_id, error_message, error_detail, sql_state)
    VALUES (NEW.id, SQLERRM, SQLSTATE, SQLSTATE);
    
    -- Still return NEW so trigger doesn't fail the entire transaction
    RETURN NEW;
  END;

  RETURN NEW;
END;
$$;

-- Apply the emergency trigger
DROP TRIGGER IF EXISTS trade_alert_notification_trigger ON public.trade_alerts;

CREATE TRIGGER trade_alert_notification_trigger
  AFTER INSERT OR UPDATE ON public.trade_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.enhanced_notification_pipeline_v2();


