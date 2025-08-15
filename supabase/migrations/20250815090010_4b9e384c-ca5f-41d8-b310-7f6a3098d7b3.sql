-- Create comprehensive UPDATE trigger for automated signal notifications
-- This replaces manual triggering with 100% automated notifications

-- First, create an enhanced notification trigger function that handles all signal changes
CREATE OR REPLACE FUNCTION public.auto_notify_signal_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  author_profile RECORD;
  notification_payload JSONB;
  request_id BIGINT;
  service_role_key TEXT;
  function_url TEXT;
  change_types TEXT[] := '{}';
  is_significant_change BOOLEAN := false;
BEGIN
  -- Only trigger for signals created by admins or educators
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = COALESCE(NEW.user_id, OLD.user_id)
    AND (access_level = ANY(ARRAY['admin'::access_level_enum, 'moderator'::access_level_enum]) 
         OR user_type = 'educator'::user_type_enum)
  ) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Get service role key and function URL
  service_role_key := current_setting('app.settings.service_role_key', true);
  IF service_role_key IS NULL OR service_role_key = '' THEN
    service_role_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg2OTI1MCwiZXhwIjoyMDY3NDQ1MjUwfQ.0tHLp8yWK_lNP_6yrdNn4BqM3kGlWnKMcDf9fYMa2hU';
  END IF;
  
  function_url := 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/signal-notification-dispatcher';

  -- Fetch author information
  SELECT display_name, avatar_url 
  INTO author_profile
  FROM public.public_profiles 
  WHERE id = COALESCE(NEW.user_id, OLD.user_id);

  -- Handle INSERT (signal creation) - already handled by existing trigger
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;

  -- Handle UPDATE - detect what changed and determine if notification is needed
  IF TG_OP = 'UPDATE' THEN
    -- Status change (pending -> active, active -> closed)
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      change_types := array_append(change_types, 'status_change');
      is_significant_change := true;
    END IF;

    -- TP hits change
    IF OLD.tp_hits IS DISTINCT FROM NEW.tp_hits THEN
      change_types := array_append(change_types, 'tp_hits');
      is_significant_change := true;
    END IF;

    -- Manual closure (close_reason added)
    IF OLD.close_reason IS DISTINCT FROM NEW.close_reason AND NEW.close_reason IS NOT NULL THEN
      change_types := array_append(change_types, 'manual_close');
      is_significant_change := true;
    END IF;

    -- Notes update (only if substantive change)
    IF OLD.notes IS DISTINCT FROM NEW.notes AND 
       (OLD.notes IS NULL OR NEW.notes IS NULL OR 
        length(COALESCE(NEW.notes, '')) - length(COALESCE(OLD.notes, '')) > 10) THEN
      change_types := array_append(change_types, 'notes_update');
      is_significant_change := true;
    END IF;

    -- Trade parameter changes (entry, stop loss, TPs) - only if signal is not active
    IF NEW.status != 'active' AND (
      OLD.entry_price IS DISTINCT FROM NEW.entry_price OR
      OLD.stop_loss IS DISTINCT FROM NEW.stop_loss OR
      OLD.tp1 IS DISTINCT FROM NEW.tp1 OR
      OLD.tp2 IS DISTINCT FROM NEW.tp2 OR
      OLD.tp3 IS DISTINCT FROM NEW.tp3 OR
      OLD.tp4 IS DISTINCT FROM NEW.tp4 OR
      OLD.tp5 IS DISTINCT FROM NEW.tp5
    ) THEN
      change_types := array_append(change_types, 'parameters_update');
      is_significant_change := true;
    END IF;

    -- Skip notification if no significant changes
    IF NOT is_significant_change THEN
      RETURN NEW;
    END IF;

    -- Build notification payload for signal updates
    notification_payload := jsonb_build_object(
      'notifications', jsonb_build_array(
        jsonb_build_object(
          'signal_id', NEW.id,
          'user_id', NEW.user_id,
          'asset_name', NEW.asset_name,
          'trade_type', NEW.trade_type,
          'entry_price', NEW.entry_price,
          'stop_loss', NEW.stop_loss,
          'tp1', NEW.tp1,
          'tp2', NEW.tp2,
          'tp3', NEW.tp3,
          'tp4', NEW.tp4,
          'tp5', NEW.tp5,
          'symbol', NEW.tradermade_symbol,
          'tradermade_symbol', NEW.tradermade_symbol,
          'created_at', NEW.created_at,
          'updated_at', NEW.updated_at,
          'notification_type', 'signal_updated',
          'alert_type', 'signal_updated',
          'target_price', NEW.entry_price,
          'triggered_price', NEW.entry_price,
          'status', NEW.status,
          'tp_hits', NEW.tp_hits,
          'close_reason', NEW.close_reason,
          'notes', NEW.notes,
          'change_types', change_types,
          'author_id', NEW.user_id,
          'author_name', COALESCE(author_profile.display_name, 'Unknown'),
          'author_avatar_url', author_profile.avatar_url,
          'delivery_channels', ARRAY['push', 'in_app'],
          'include_creator', false
        )
      )
    );

    -- Make HTTP call to signal-notification-dispatcher
    BEGIN
      SELECT net.http_post(
        url := function_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_role_key,
          'User-Agent', 'Supabase-Trigger/1.0'
        ),
        body := notification_payload,
        timeout_milliseconds := 10000
      ) INTO request_id;
      
      INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
      VALUES (
        'auto_notify_signal_changes', 
        NOW(), 
        1, 
        'success',
        'Signal update notification queued - Request ID: ' || COALESCE(request_id::text, 'null') || 
        ' - Signal: ' || NEW.asset_name || ' - Changes: ' || array_to_string(change_types, ', ')
      );
      
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
      VALUES (
        'auto_notify_signal_changes', 
        NOW(), 
        0, 
        'error', 
        'HTTP request failed: ' || SQLERRM || ' - Signal ID: ' || NEW.id::text
      );
    END;
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
  VALUES (
    'auto_notify_signal_changes', 
    NOW(), 
    0, 
    'error', 
    'Trigger exception: ' || SQLERRM || ' - Signal ID: ' || COALESCE(NEW.id::text, OLD.id::text)
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Create the UPDATE trigger on trade_alerts table
DROP TRIGGER IF EXISTS notify_signal_changes ON public.trade_alerts;
CREATE TRIGGER notify_signal_changes
  AFTER UPDATE ON public.trade_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_notify_signal_changes();

-- Create enhanced trigger for price-based alert monitoring integration
CREATE OR REPLACE FUNCTION public.auto_notify_price_alerts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  signal_info RECORD;
  author_profile RECORD;
  notification_payload JSONB;
  request_id BIGINT;
  service_role_key TEXT;
  function_url TEXT;
BEGIN
  -- Only process if this is a price-triggered alert
  IF NEW.is_active = false AND OLD.is_active = true THEN
    -- Get signal information
    SELECT ta.*, pp.display_name, pp.avatar_url
    INTO signal_info
    FROM public.trade_alerts ta
    LEFT JOIN public.public_profiles pp ON pp.id = ta.user_id
    WHERE ta.id = NEW.signal_id;

    IF NOT FOUND THEN
      RETURN NEW;
    END IF;

    -- Only notify for signals by admins/educators
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = signal_info.user_id
      AND (access_level = ANY(ARRAY['admin'::access_level_enum, 'moderator'::access_level_enum]) 
           OR user_type = 'educator'::user_type_enum)
    ) THEN
      RETURN NEW;
    END IF;

    -- Get service configuration
    service_role_key := current_setting('app.settings.service_role_key', true);
    IF service_role_key IS NULL OR service_role_key = '' THEN
      service_role_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg2OTI1MCwiZXhwIjoyMDY3NDQ1MjUwfQ.0tHLp8yWK_lNP_6yrdNn4BqM3kGlWnKMcDf9fYMa2hU';
    END IF;
    
    function_url := 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/signal-notification-dispatcher';

    -- Build notification payload for price alerts
    notification_payload := jsonb_build_object(
      'notifications', jsonb_build_array(
        jsonb_build_object(
          'signal_id', signal_info.id,
          'user_id', signal_info.user_id,
          'asset_name', signal_info.asset_name,
          'trade_type', signal_info.trade_type,
          'entry_price', signal_info.entry_price,
          'stop_loss', signal_info.stop_loss,
          'tp1', signal_info.tp1,
          'tp2', signal_info.tp2,
          'tp3', signal_info.tp3,
          'tp4', signal_info.tp4,
          'tp5', signal_info.tp5,
          'symbol', signal_info.tradermade_symbol,
          'tradermade_symbol', signal_info.tradermade_symbol,
          'notification_type', NEW.alert_type,
          'alert_type', NEW.alert_type,
          'target_price', NEW.target_price,
          'triggered_price', NEW.current_price,
          'status', signal_info.status,
          'author_id', signal_info.user_id,
          'author_name', COALESCE(signal_info.display_name, 'Unknown'),
          'author_avatar_url', signal_info.avatar_url,
          'delivery_channels', ARRAY['push', 'in_app', 'discord', 'telegram'],
          'include_creator', false
        )
      )
    );

    -- Send notification
    BEGIN
      SELECT net.http_post(
        url := function_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_role_key,
          'User-Agent', 'Supabase-Trigger/1.0'
        ),
        body := notification_payload,
        timeout_milliseconds := 10000
      ) INTO request_id;
      
      INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
      VALUES (
        'auto_notify_price_alerts', 
        NOW(), 
        1, 
        'success',
        'Price alert notification queued - Request ID: ' || COALESCE(request_id::text, 'null') || 
        ' - Alert: ' || NEW.alert_type || ' - Signal: ' || signal_info.asset_name
      );
      
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
      VALUES (
        'auto_notify_price_alerts', 
        NOW(), 
        0, 
        'error', 
        'HTTP request failed: ' || SQLERRM || ' - Alert ID: ' || NEW.id::text
      );
    END;
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
  VALUES (
    'auto_notify_price_alerts', 
    NOW(), 
    0, 
    'error', 
    'Trigger exception: ' || SQLERRM || ' - Alert ID: ' || NEW.id::text
  );
  
  RETURN NEW;
END;
$function$;

-- Create trigger for alert monitoring price alerts
DROP TRIGGER IF EXISTS notify_price_alerts ON public.alert_monitoring;
CREATE TRIGGER notify_price_alerts
  AFTER UPDATE ON public.alert_monitoring
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_notify_price_alerts();