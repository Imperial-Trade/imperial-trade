-- Fix the search path security warning for the auto_notify_signal_creation function
CREATE OR REPLACE FUNCTION public.auto_notify_signal_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  author_profile RECORD;
  notification_payload JSONB;
  http_response RECORD;
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
    
    -- Build the notification payload
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
          'delivery_channels', ARRAY['push', 'in_app']
        )
      )
    );
    
    -- Make HTTP call to signal-notification-dispatcher with timeout
    BEGIN
      SELECT INTO http_response * FROM net.http_post(
        url := function_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_role_key,
          'User-Agent', 'Supabase-Trigger/1.0'
        ),
        body := notification_payload,
        timeout_milliseconds := 10000
      );
    EXCEPTION WHEN OTHERS THEN
      -- Log HTTP call failure
      INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
      VALUES (
        'auto_notify_signal_creation', 
        NOW(), 
        0, 
        'error', 
        'HTTP call exception: ' || SQLERRM
      );
      -- Don't fail the original insert
      RETURN NEW;
    END;
    
    -- Log the result for debugging
    INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
    VALUES (
      'auto_notify_signal_creation', 
      NOW(), 
      1, 
      CASE 
        WHEN http_response.status_code BETWEEN 200 AND 299 THEN 'success'
        ELSE 'error'
      END,
      CASE 
        WHEN http_response.status_code BETWEEN 200 AND 299 THEN 
          'Notifications sent successfully - Status: ' || http_response.status_code
        ELSE 
          'HTTP call failed - Status: ' || COALESCE(http_response.status_code::text, 'null') || 
          ' - Response: ' || COALESCE(substring(http_response.content, 1, 500), 'No response content')
      END
    );
    
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log any exceptions
  INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
  VALUES (
    'auto_notify_signal_creation', 
    NOW(), 
    0, 
    'error', 
    'Function exception: ' || SQLERRM || ' - Signal ID: ' || NEW.id::text
  );
  
  -- Don't fail the original insert
  RETURN NEW;
END;
$function$;