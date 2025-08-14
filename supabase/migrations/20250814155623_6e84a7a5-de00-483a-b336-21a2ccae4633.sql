-- Fix the auto_notify_signal_creation trigger to properly handle net.http_post response
-- The net.http_post function returns a request ID, not the actual HTTP response
CREATE OR REPLACE FUNCTION public.auto_notify_signal_creation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  author_profile RECORD;
  notification_payload JSONB;
  request_id UUID;
  service_role_key TEXT;
  function_url TEXT;
BEGIN
  -- Only trigger for signals created by admins or educators
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = NEW.user_id 
    AND (access_level = ANY(ARRAY['admin'::access_level_enum, 'moderator'::access_level_enum]) 
         OR user_type = 'educator'::user_type_enum)
  ) THEN
    
    -- Get service role key from environment
    service_role_key := current_setting('app.settings.service_role_key', true);
    IF service_role_key IS NULL OR service_role_key = '' THEN
      -- Fallback for development/testing
      service_role_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg2OTI1MCwiZXhwIjoyMDY3NDQ1MjUwfQ.0tHLp8yWK_lNP_6yrdNn4BqM3kGlWnKMcDf9fYMa2hU';
    END IF;
    
    -- Build function URL
    function_url := 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/signal-notification-dispatcher';
    
    -- Fetch author information for the notification
    SELECT display_name, avatar_url 
    INTO author_profile
    FROM public.public_profiles 
    WHERE id = NEW.user_id;
    
    -- Build the notification payload - edge function will handle sending to ALL users including creator
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
          'include_creator', true
        )
      )
    );
    
    -- Make HTTP call to signal-notification-dispatcher (fire-and-forget)
    BEGIN
      -- net.http_post returns a request ID, not the HTTP response
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
      
      -- Log successful request queuing
      INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
      VALUES (
        'auto_notify_signal_creation', 
        NOW(), 
        1, 
        'success',
        'Notification request queued successfully - Request ID: ' || COALESCE(request_id::text, 'null') || ' - Signal: ' || NEW.asset_name
      );
      
    EXCEPTION WHEN OTHERS THEN
      -- Log HTTP call failure but don't fail the signal creation
      INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
      VALUES (
        'auto_notify_signal_creation', 
        NOW(), 
        0, 
        'error', 
        'HTTP request failed: ' || SQLERRM || ' - Signal ID: ' || NEW.id::text
      );
      -- Don't fail the original signal insert
      RETURN NEW;
    END;
    
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log any other exceptions but don't fail signal creation
  INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
  VALUES (
    'auto_notify_signal_creation', 
    NOW(), 
    0, 
    'error', 
    'Trigger exception: ' || SQLERRM || ' - Signal ID: ' || NEW.id::text
  );
  
  -- Don't fail the original signal insert
  RETURN NEW;
END;
$function$;