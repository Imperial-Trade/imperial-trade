-- Update the auto_notify_signal_creation function to directly call the notification dispatcher
CREATE OR REPLACE FUNCTION public.auto_notify_signal_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  author_profile RECORD;
  notification_payload JSONB;
  http_response RECORD;
BEGIN
  -- Only trigger for signals created by admins or educators
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = NEW.user_id 
    AND (access_level = ANY(ARRAY['admin'::access_level_enum, 'moderator'::access_level_enum]) 
         OR user_type = 'educator'::user_type_enum)
  ) THEN
    
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
          'delivery_channels', ARRAY['push']
        )
      )
    );
    
    -- Make HTTP call to signal-notification-dispatcher
    SELECT INTO http_response * FROM net.http_post(
      url := 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/signal-notification-dispatcher',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := notification_payload
    );
    
    -- Log the result (success or failure)
    IF http_response.status_code BETWEEN 200 AND 299 THEN
      -- Success - optionally log to a success table
      NULL;
    ELSE
      -- Log error for debugging
      INSERT INTO cron_job_logs (job_name, execution_time, records_affected, status, error_message)
      VALUES (
        'auto_notify_signal_creation', 
        NOW(), 
        0, 
        'error', 
        'HTTP call failed: ' || http_response.status_code || ' - ' || COALESCE(http_response.content, 'No response content')
      );
    END IF;
    
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log any exceptions
  INSERT INTO cron_job_logs (job_name, execution_time, records_affected, status, error_message)
  VALUES (
    'auto_notify_signal_creation', 
    NOW(), 
    0, 
    'error', 
    'Exception: ' || SQLERRM
  );
  
  -- Don't fail the original insert
  RETURN NEW;
END;
$function$;

-- Enable the pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a setting for the service role key (this will need to be set separately)
-- This is a placeholder - the actual key will need to be configured in Supabase dashboard
ALTER DATABASE postgres SET app.settings.service_role_key = 'service_role_key_placeholder';