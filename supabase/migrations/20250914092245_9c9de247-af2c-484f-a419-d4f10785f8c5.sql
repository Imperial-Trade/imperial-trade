-- Restore missing database triggers for notification system

-- First ensure the trigger functions exist
CREATE OR REPLACE FUNCTION public.auto_notify_signal_creation()
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
  eligible_users UUID[];
BEGIN
  -- Only trigger for signals created by admins or educators
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = NEW.user_id 
    AND (access_level = ANY(ARRAY['admin'::access_level_enum, 'moderator'::access_level_enum]) 
         OR user_type = 'educator'::user_type_enum)
  ) THEN
    
    -- Use hardcoded service role key and function URL for reliability
    service_role_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg2OTI1MCwiZXhwIjoyMDY3NDQ1MjUwfQ.0tHLp8yWK_lNP_6yrdNn4BqM3kGlWnKMcDf9fYMa2hU';
    function_url := 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/enhanced-signal-notification-dispatcher';
    
    -- Fetch author information
    SELECT display_name, avatar_url
    INTO author_profile
    FROM public.public_profiles 
    WHERE id = NEW.user_id;
    
    -- Get eligible users - ALL users with active push notifications
    SELECT array_agg(p.id) INTO eligible_users
    FROM public.profiles p
    WHERE p.account_status = 'active'
    AND p.push_subscription_active = true
    AND p.onesignal_player_id IS NOT NULL
    AND p.onesignal_subscription_status IN ('subscribed', 'subscribed_dev')
    AND p.id != NEW.user_id; -- Don't notify the creator
    
    -- Build notification payload
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
          'notification_type', 'signal_created',
          'alert_type', 'signal_created',
          'target_price', NEW.entry_price,
          'triggered_price', NEW.entry_price,
          'status', NEW.status,
          'author_id', NEW.user_id,
          'author_name', COALESCE(author_profile.display_name, 'Unknown'),
          'author_avatar_url', author_profile.avatar_url,
          'delivery_channels', ARRAY['push', 'in_app'],
          'user_ids', eligible_users,
          'include_creator', false
        )
      )
    );
    
    -- Send notification only if we have eligible users
    IF eligible_users IS NOT NULL AND array_length(eligible_users, 1) > 0 THEN
      BEGIN
        SELECT net.http_post(
          url := function_url,
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || service_role_key,
            'User-Agent', 'Supabase-Enhanced-Trigger/2.0'
          ),
          body := notification_payload,
          timeout_milliseconds := 10000
        ) INTO request_id;
        
        INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
        VALUES (
          'auto_notify_signal_creation', 
          NOW(), 
          array_length(eligible_users, 1), 
          'success',
          'Signal creation notification sent - Request ID: ' || COALESCE(request_id::text, 'null') || 
          ' - Signal: ' || NEW.asset_name || ' - Users: ' || array_length(eligible_users, 1)
        );
        
      EXCEPTION WHEN OTHERS THEN
        INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
        VALUES (
          'auto_notify_signal_creation', 
          NOW(), 
          0, 
          'error', 
          'Signal creation notification failed: ' || SQLERRM || ' - Signal ID: ' || NEW.id::text
        );
      END;
    ELSE
      INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
      VALUES (
        'auto_notify_signal_creation', 
        NOW(), 
        0, 
        'skipped',
        'No eligible users found for notification - Signal: ' || NEW.asset_name
      );
    END IF;
    
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
  VALUES (
    'auto_notify_signal_creation', 
    NOW(), 
    0, 
    'error', 
    'Signal creation trigger exception: ' || SQLERRM || ' - Signal ID: ' || NEW.id::text
  );
  
  RETURN NEW;
END;
$function$;

-- Create the trigger for new signal creation
DROP TRIGGER IF EXISTS trigger_auto_notify_signal_creation ON public.trade_alerts;
CREATE TRIGGER trigger_auto_notify_signal_creation
  AFTER INSERT ON public.trade_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_notify_signal_creation();

-- Update signal updates trigger to include development subscriptions
CREATE OR REPLACE FUNCTION public.auto_notify_signal_updates()
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
  priority_level INTEGER := 1;
  eligible_users UUID[];
BEGIN
  -- Only trigger for signals created by admins or educators
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = NEW.user_id
    AND (access_level = ANY(ARRAY['admin'::access_level_enum, 'moderator'::access_level_enum]) 
         OR user_type = 'educator'::user_type_enum)
  ) THEN
    RETURN NEW;
  END IF;

  -- Detect significant changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    change_types := array_append(change_types, 'status_change');
    is_significant_change := true;
    priority_level := CASE 
      WHEN NEW.status = 'closed' THEN 2
      WHEN NEW.status = 'active' THEN 2
      ELSE 1 
    END;
  END IF;

  IF OLD.tp_hits IS DISTINCT FROM NEW.tp_hits THEN
    change_types := array_append(change_types, 'tp_hits');
    is_significant_change := true;
    priority_level := 2;
  END IF;

  IF OLD.close_reason IS DISTINCT FROM NEW.close_reason AND NEW.close_reason IS NOT NULL THEN
    change_types := array_append(change_types, 'manual_close');
    is_significant_change := true;
    priority_level := 2;
  END IF;

  -- Skip if no significant changes
  IF NOT is_significant_change THEN
    RETURN NEW;
  END IF;

  -- Get service configuration
  service_role_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg2OTI1MCwiZXhwIjoyMDY3NDQ1MjUwfQ.0tHLp8yWK_lNP_6yrdNn4BqM3kGlWnKMcDf9fYMa2hU';
  function_url := 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/enhanced-signal-notification-dispatcher';

  -- Fetch author information
  SELECT display_name, avatar_url 
  INTO author_profile
  FROM public.public_profiles 
  WHERE id = NEW.user_id;

  -- Get eligible users - include development subscriptions
  SELECT array_agg(p.id) INTO eligible_users
  FROM public.profiles p
  WHERE p.account_status = 'active'
  AND p.push_subscription_active = true
  AND p.onesignal_player_id IS NOT NULL
  AND p.onesignal_subscription_status IN ('subscribed', 'subscribed_dev')
  AND p.id != NEW.user_id;

  -- Only proceed if we have users to notify
  IF eligible_users IS NULL OR array_length(eligible_users, 1) = 0 THEN
    INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
    VALUES (
      'auto_notify_signal_updates', 
      NOW(), 
      0, 
      'skipped',
      'No eligible users found for notification - Signal: ' || NEW.asset_name || ' - Changes: ' || array_to_string(change_types, ', ')
    );
    RETURN NEW;
  END IF;

  -- Build notification payload
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
        'priority_level', priority_level,
        'author_id', NEW.user_id,
        'author_name', COALESCE(author_profile.display_name, 'Unknown'),
        'author_avatar_url', author_profile.avatar_url,
        'delivery_channels', ARRAY['push', 'in_app'],
        'user_ids', eligible_users,
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
        'User-Agent', 'Supabase-Enhanced-Trigger/2.0'
      ),
      body := notification_payload,
      timeout_milliseconds := 10000
    ) INTO request_id;
    
    INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
    VALUES (
      'auto_notify_signal_updates', 
      NOW(), 
      array_length(eligible_users, 1), 
      'success',
      'Signal update notification sent - Request ID: ' || COALESCE(request_id::text, 'null') || 
      ' - Signal: ' || NEW.asset_name || ' - Changes: ' || array_to_string(change_types, ', ') ||
      ' - Users: ' || array_length(eligible_users, 1)::text || ' - Priority: ' || priority_level::text
    );
    
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
    VALUES (
      'auto_notify_signal_updates', 
      NOW(), 
      0, 
      'error', 
      'Signal update notification failed: ' || SQLERRM || ' - Signal ID: ' || NEW.id::text
    );
  END;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
  VALUES (
    'auto_notify_signal_updates', 
    NOW(), 
    0, 
    'error', 
    'Signal update trigger exception: ' || SQLERRM || ' - Signal ID: ' || NEW.id::text
  );
  
  RETURN NEW;
END;
$function$;

-- Create the trigger for signal updates
DROP TRIGGER IF EXISTS trigger_auto_notify_signal_updates ON public.trade_alerts;
CREATE TRIGGER trigger_auto_notify_signal_updates
  AFTER UPDATE ON public.trade_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_notify_signal_updates();