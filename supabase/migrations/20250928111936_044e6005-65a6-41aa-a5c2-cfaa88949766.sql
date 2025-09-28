-- Step 1: Fix Database Trigger for Notes Notifications
-- Change the notes condition from length > 10 to length > 0 to allow short notes like "hi"

CREATE OR REPLACE FUNCTION public.enhanced_notification_pipeline()
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
  change_types TEXT[] := '{}';
  is_significant_change BOOLEAN := false;
  priority_level INTEGER := 1;
  actual_changes JSONB := '{}';
  change_source TEXT := 'user_update';
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

  -- Enhanced change detection with strict validation
  IF TG_OP = 'INSERT' THEN
    change_types := array_append(change_types, 'signal_created');
    is_significant_change := true;
    priority_level := 2;
    change_source := 'signal_creation';
    actual_changes := jsonb_build_object('type', 'new_signal', 'signal_id', NEW.id);
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- CRITICAL: Enhanced field-by-field change detection
    
    -- Status changes (most critical)
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      change_types := array_append(change_types, 'status_change');
      is_significant_change := true;
      priority_level := CASE 
        WHEN NEW.status = 'closed' THEN 3
        WHEN NEW.status = 'active' THEN 2
        ELSE 1 
      END;
      actual_changes := actual_changes || jsonb_build_object(
        'status_change', jsonb_build_object(
          'old', OLD.status, 
          'new', NEW.status
        )
      );
    END IF;

    -- TP hits (validate array actually changed and expanded)
    IF OLD.tp_hits IS DISTINCT FROM NEW.tp_hits AND 
       array_length(NEW.tp_hits, 1) > COALESCE(array_length(OLD.tp_hits, 1), 0) THEN
      change_types := array_append(change_types, 'tp_hits');
      is_significant_change := true;
      priority_level := 2;
      actual_changes := actual_changes || jsonb_build_object(
        'tp_hits', jsonb_build_object(
          'old', COALESCE(OLD.tp_hits, '{}'), 
          'new', NEW.tp_hits,
          'new_hits', array_length(NEW.tp_hits, 1) - COALESCE(array_length(OLD.tp_hits, 1), 0)
        )
      );
    END IF;

    -- Manual close with reason
    IF OLD.close_reason IS DISTINCT FROM NEW.close_reason AND NEW.close_reason IS NOT NULL THEN
      change_types := array_append(change_types, 'manual_close');
      is_significant_change := true;
      priority_level := 2;
      actual_changes := actual_changes || jsonb_build_object(
        'close_reason', jsonb_build_object(
          'old', OLD.close_reason, 
          'new', NEW.close_reason
        )
      );
    END IF;

    -- Price updates (only significant price changes)
    IF OLD.entry_price IS DISTINCT FROM NEW.entry_price THEN
      change_types := array_append(change_types, 'entry_price_update');
      is_significant_change := true;
      priority_level := 1;
      actual_changes := actual_changes || jsonb_build_object(
        'entry_price', jsonb_build_object(
          'old', OLD.entry_price, 
          'new', NEW.entry_price
        )
      );
    END IF;

    -- Stop loss updates
    IF OLD.stop_loss IS DISTINCT FROM NEW.stop_loss THEN
      change_types := array_append(change_types, 'stop_loss_update');
      is_significant_change := true;
      priority_level := 1;
      actual_changes := actual_changes || jsonb_build_object(
        'stop_loss', jsonb_build_object(
          'old', OLD.stop_loss, 
          'new', NEW.stop_loss
        )
      );
    END IF;

    -- FIXED: Notes updates (substantial notes changes are now significant)
    -- CHANGE: From length(trim(NEW.notes)) > 10 to length(trim(NEW.notes)) > 0
    IF OLD.notes IS DISTINCT FROM NEW.notes AND 
       (NEW.notes IS NOT NULL AND length(trim(NEW.notes)) > 0) THEN
      change_types := array_append(change_types, 'notes_updated');
      -- CRITICAL FIX: All notes updates are now significant, including short ones like "hi"
      is_significant_change := true;
      priority_level := 1;
      actual_changes := actual_changes || jsonb_build_object(
        'notes', jsonb_build_object(
          'old_length', COALESCE(length(OLD.notes), 0), 
          'new_length', length(NEW.notes),
          'updated', true
        )
      );
    END IF;

    -- CRITICAL: Skip notification if no significant changes detected
    IF NOT is_significant_change OR array_length(change_types, 1) = 0 THEN
      INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
      VALUES (
        'enhanced_notification_pipeline', 
        NOW(), 
        0, 
        'skipped_no_changes',
        'No significant changes detected - Signal ID: ' || NEW.id::text || 
        ' - Change types: ' || COALESCE(array_to_string(change_types, ', '), 'none') ||
        ' - Actual changes: ' || actual_changes::text
      );
      RETURN NEW;
    END IF;

    -- Detect system vs user updates
    IF current_setting('app.is_system_operation', true)::boolean = true THEN
      change_source := 'system_update';
    END IF;
  END IF;

  -- FIXED: Fetch author information with CORRECT column names
  SELECT COALESCE(p.display_name, 'Unknown Trader') as display_name, p.avatar_url
  INTO author_profile
  FROM public.profiles p 
  WHERE p.id = NEW.user_id;

  -- Enhanced fallback if profile not found
  IF author_profile.display_name IS NULL THEN
    author_profile.display_name := 'Unknown Trader';
    author_profile.avatar_url := NULL;
  END IF;

  -- Get eligible users with enhanced filtering
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

  -- Enhanced validation: Only proceed if we have eligible users
  IF eligible_users IS NULL OR array_length(eligible_users, 1) = 0 THEN
    INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
    VALUES (
      'enhanced_notification_pipeline', 
      NOW(), 
      0, 
      'skipped_no_users',
      'No eligible users found - Signal: ' || NEW.asset_name || 
      ' - Changes: ' || array_to_string(change_types, ', ') ||
      ' - Change source: ' || change_source ||
      ' - Actual changes: ' || actual_changes::text
    );
    RETURN NEW;
  END IF;

  -- Build enhanced notification payload with validation metadata
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
        'actual_changes', actual_changes, -- NEW: Include actual change data
        'change_source', change_source,   -- NEW: Track change source
        'priority_level', priority_level,
        'author_id', NEW.user_id,
        'author_name', author_profile.display_name,
        'author_avatar_url', author_profile.avatar_url,
        'delivery_channels', ARRAY['push', 'in_app'],
        'user_ids', eligible_users,
        'include_creator', false,
        'validation_metadata', jsonb_build_object(
          'trigger_timestamp', now(),
          'change_validation', 'enhanced',
          'phantom_prevention', true
        )
      )
    )
  );

  -- Send enhanced notification with comprehensive error handling
  BEGIN
    SELECT net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key,
        'User-Agent', 'Supabase-Enhanced-Pipeline/3.0'
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
      'VALIDATED notification sent - Request ID: ' || COALESCE(request_id::text, 'null') || 
      ' - Signal: ' || NEW.asset_name || ' - Operation: ' || TG_OP ||
      ' - Changes: ' || array_to_string(change_types, ', ') ||
      ' - Users: ' || array_length(eligible_users, 1)::text || 
      ' - Priority: ' || priority_level::text ||
      ' - Author: ' || author_profile.display_name ||
      ' - Change source: ' || change_source ||
      ' - Validation: enhanced'
    );
    
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
    VALUES (
      'enhanced_notification_pipeline', 
      NOW(), 
      0, 
      'error', 
      'Enhanced notification failed: ' || SQLERRM || ' - Signal ID: ' || NEW.id::text || 
      ' - Operation: ' || TG_OP || ' - Changes: ' || array_to_string(change_types, ', ')
    );
  END;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
  VALUES (
    'enhanced_notification_pipeline', 
    NOW(), 
    0, 
    'critical_error',
    'CRITICAL: Enhanced pipeline exception: ' || SQLERRM || 
    ' - Signal ID: ' || NEW.id::text || ' - Operation: ' || TG_OP
  );
  
  RETURN NEW;
END;
$function$;

-- Step 3: Fix RLS policies for "Close My Signal" functionality
-- Ensure there are clear policies for users to close their own signals

-- First check existing policies and create a comprehensive policy for owners
CREATE POLICY "signal_owners_can_update_their_signals"
ON public.trade_alerts
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Ensure admins can update all signals
CREATE POLICY "admins_can_update_all_signals" 
ON public.trade_alerts
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));