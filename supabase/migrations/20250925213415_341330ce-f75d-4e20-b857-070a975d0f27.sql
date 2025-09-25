-- Phase 1: Fix Author Name Resolution in enhanced_notification_pipeline
CREATE OR REPLACE FUNCTION public.enhanced_notification_pipeline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  author_profile RECORD;
  notification_payload JSONB;
  request_id BIGINT;
  service_role_key TEXT;
  function_url TEXT;
  eligible_users UUID[];
  change_types TEXT[] := '{}';
  is_significant_change BOOLEAN := false;
  priority_level INTEGER := 1;
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

  -- Configuration
  service_role_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg2OTI1MCwiZXhwIjoyMDY3NDQ1MjUwfQ.0tHLp8yWK_lNP_6yrdNn4BqM3kGlWnKMcDf9fYMa2hU';
  function_url := 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/enhanced-signal-notification-dispatcher';

  -- Detect operation type and significant changes
  IF TG_OP = 'INSERT' THEN
    change_types := array_append(change_types, 'signal_created');
    is_significant_change := true;
    priority_level := 2; -- High priority for new signals
  ELSIF TG_OP = 'UPDATE' THEN
    -- Detect specific changes with better precision
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      change_types := array_append(change_types, 'status_change');
      is_significant_change := true;
      priority_level := CASE 
        WHEN NEW.status = 'closed' THEN 2
        WHEN NEW.status = 'active' THEN 2
        ELSE 1 
      END;
    END IF;

    -- Only consider TP hits significant if array actually changed
    IF OLD.tp_hits IS DISTINCT FROM NEW.tp_hits AND array_length(NEW.tp_hits, 1) > COALESCE(array_length(OLD.tp_hits, 1), 0) THEN
      change_types := array_append(change_types, 'tp_hits');
      is_significant_change := true;
      priority_level := 2;
    END IF;

    IF OLD.close_reason IS DISTINCT FROM NEW.close_reason AND NEW.close_reason IS NOT NULL THEN
      change_types := array_append(change_types, 'manual_close');
      is_significant_change := true;
      priority_level := 2;
    END IF;

    -- Skip notes-only updates unless specifically requested
    IF OLD.notes IS DISTINCT FROM NEW.notes AND array_length(change_types, 1) = 0 THEN
      change_types := array_append(change_types, 'notes_updated');
      is_significant_change := false; -- Notes updates are low priority
      priority_level := 1;
    END IF;
  END IF;

  -- Skip if no significant changes for updates
  IF TG_OP = 'UPDATE' AND NOT is_significant_change THEN
    RETURN NEW;
  END IF;

  -- Fetch author information with proper fallback - FIX FOR UNDEFINED ISSUE
  SELECT COALESCE(p.display_name, p.full_name, 'Unknown Trader') as display_name, p.avatar_url
  INTO author_profile
  FROM public.profiles p 
  WHERE p.id = NEW.user_id;

  -- Additional fallback if profile not found
  IF author_profile.display_name IS NULL THEN
    author_profile.display_name := 'Unknown Trader';
    author_profile.avatar_url := NULL;
  END IF;

  -- Get eligible users with notification preferences
  SELECT array_agg(p.id) INTO eligible_users
  FROM public.profiles p
  LEFT JOIN public.notification_preferences np ON p.id = np.user_id
  WHERE p.account_status = 'active'
  AND p.push_subscription_active = true
  AND p.onesignal_player_id IS NOT NULL
  AND p.onesignal_subscription_status IN ('subscribed', 'subscribed_dev')
  AND p.id != NEW.user_id -- Don't notify creator
  AND (
    np.id IS NULL OR -- Default to enabled if no preferences set
    (TG_OP = 'INSERT' AND COALESCE(np.signal_created, true)) OR
    (TG_OP = 'UPDATE' AND COALESCE(np.signal_updated, true))
  );

  -- Only proceed if we have eligible users
  IF eligible_users IS NULL OR array_length(eligible_users, 1) = 0 THEN
    INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
    VALUES (
      'enhanced_notification_pipeline', 
      NOW(), 
      0, 
      'skipped',
      'No eligible users found - Signal: ' || NEW.asset_name || ' - Changes: ' || array_to_string(change_types, ', ')
    );
    RETURN NEW;
  END IF;

  -- Build enhanced notification payload with proper author name
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
        'notification_type', CASE 
          WHEN TG_OP = 'INSERT' THEN 'signal_created'
          ELSE 'signal_updated'
        END,
        'alert_type', CASE 
          WHEN TG_OP = 'INSERT' THEN 'signal_created'
          ELSE 'signal_updated'
        END,
        'target_price', NEW.entry_price,
        'triggered_price', NEW.entry_price,
        'status', NEW.status,
        'tp_hits', NEW.tp_hits,
        'close_reason', NEW.close_reason,
        'notes', NEW.notes,
        'change_types', change_types,
        'priority_level', priority_level,
        'author_id', NEW.user_id,
        'author_name', author_profile.display_name, -- FIXED: Will never be null now
        'author_avatar_url', author_profile.avatar_url,
        'delivery_channels', ARRAY['push', 'in_app'],
        'user_ids', eligible_users,
        'include_creator', false
      )
    )
  );

  -- Send enhanced notification
  BEGIN
    SELECT net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key,
        'User-Agent', 'Supabase-Enhanced-Pipeline/2.1'
      ),
      body := notification_payload,
      timeout_milliseconds := 15000
    ) INTO request_id;
    
    INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
    VALUES (
      'enhanced_notification_pipeline', 
      NOW(), 
      array_length(eligible_users, 1), 
      'success',
      'Enhanced notification sent - Request ID: ' || COALESCE(request_id::text, 'null') || 
      ' - Signal: ' || NEW.asset_name || ' - Operation: ' || TG_OP ||
      ' - Changes: ' || array_to_string(change_types, ', ') ||
      ' - Users: ' || array_length(eligible_users, 1)::text || 
      ' - Priority: ' || priority_level::text ||
      ' - Author: ' || author_profile.display_name
    );
    
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
    VALUES (
      'enhanced_notification_pipeline', 
      NOW(), 
      0, 
      'error', 
      'Enhanced notification failed: ' || SQLERRM || ' - Signal ID: ' || NEW.id::text || ' - Operation: ' || TG_OP
    );
  END;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
  VALUES (
    'enhanced_notification_pipeline', 
    NOW(), 
    0, 
    'error',
    'Enhanced pipeline exception: ' || SQLERRM || ' - Signal ID: ' || NEW.id::text || ' - Operation: ' || TG_OP
  );
  
  RETURN NEW;
END;
$function$;