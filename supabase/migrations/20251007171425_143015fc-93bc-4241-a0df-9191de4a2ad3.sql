-- ============================================
-- COMPLETE NOTIFICATION & SIGNAL SYSTEM FIX
-- Addresses: Status twitching, duplicate notifications, wrong data
-- ============================================

-- FIX #1: Add activation timestamp tracking to prevent duplicate activations
ALTER TABLE public.trade_alerts ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP WITH TIME ZONE;

-- FIX #2: Enhanced system operation flag for notification pipeline
CREATE OR REPLACE FUNCTION public.enhanced_notification_pipeline_v2()
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
  should_send_notification BOOLEAN := false;
  is_system_op BOOLEAN := false;
  safe_asset_name TEXT;
  calculated_pips NUMERIC;
  pip_size NUMERIC;
  config_value TEXT;
  new_tp_count INTEGER := 0;
  time_since_last_update INTERVAL;
BEGIN
  -- Configuration
  service_role_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg2OTI1MCwiZXhwIjoyMDY3NDQ1MjUwfQ.0tHLp8yWK_lNP_6yrdNn4BqM3kGlWnKMcDf9fYMa2hU';
  function_url := 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/enhanced-signal-notification-dispatcher';

  -- Validate signal creator authorization
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = NEW.user_id
    AND (access_level = ANY(ARRAY['admin'::access_level_enum, 'moderator'::access_level_enum]) 
         OR user_type = 'educator'::user_type_enum)
  ) THEN
    RETURN NEW;
  END IF;

  -- Sanitize asset name
  safe_asset_name := COALESCE(NULLIF(trim(NEW.asset_name), ''), 'Unknown Asset');

  -- Check system operation flag
  BEGIN
    config_value := current_setting('app.is_system_operation', true);
    is_system_op := (config_value IS NOT NULL AND config_value != '' AND config_value::boolean = true);
  EXCEPTION WHEN OTHERS THEN
    is_system_op := false;
  END;

  IF TG_OP = 'INSERT' THEN
    change_types := array_append(change_types, 'signal_created');
    is_significant_change := true;
    priority_level := 2;
    change_source := 'signal_creation';
    should_send_notification := true;
    actual_changes := jsonb_build_object('type', 'new_signal', 'signal_id', NEW.id);
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Calculate time since last update for rate limiting
    time_since_last_update := NEW.updated_at - OLD.updated_at;
    
    -- FIX #1: Prevent status twitching with rate limiting
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      -- Block rapid status changes (within 3 seconds)
      IF time_since_last_update < interval '3 seconds' AND OLD.status = NEW.status THEN
        INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
        VALUES ('enhanced_notification_pipeline_v2', NOW(), 0, 'blocked_rapid_change', 
                'Blocked rapid status change for signal: ' || safe_asset_name);
        RETURN NEW;
      END IF;
      
      -- FIX #1: Only fire limit_order_activated ONCE (check activated_at)
      IF OLD.status = 'pending' AND NEW.status = 'active' AND 
         (NEW.trade_type = 'buy_limit' OR NEW.trade_type = 'sell_limit') AND
         OLD.activated_at IS NULL THEN
        change_types := array_append(change_types, 'limit_order_activated');
        -- Set activated_at in the set_activation_timestamp trigger
      ELSIF NEW.status != OLD.status THEN
        change_types := array_append(change_types, 'status_change');
      END IF;
      
      is_significant_change := true;
      priority_level := CASE WHEN NEW.status = 'closed' THEN 3 WHEN NEW.status = 'active' THEN 2 ELSE 1 END;
      should_send_notification := true;
      actual_changes := actual_changes || jsonb_build_object('status_change', jsonb_build_object('old', OLD.status, 'new', NEW.status));
    END IF;

    -- FIX #6: TP hits validation with bundling
    IF OLD.tp_hits IS DISTINCT FROM NEW.tp_hits AND 
       array_length(NEW.tp_hits, 1) > COALESCE(array_length(OLD.tp_hits, 1), 0) THEN
      new_tp_count := array_length(NEW.tp_hits, 1) - COALESCE(array_length(OLD.tp_hits, 1), 0);
      
      IF new_tp_count > 1 THEN
        change_types := array_append(change_types, 'multiple_tps_hit');
      ELSE
        change_types := array_append(change_types, 'tp_hits');
      END IF;
      
      is_significant_change := true;
      priority_level := 2;
      should_send_notification := true;
      actual_changes := actual_changes || jsonb_build_object('tp_hits', jsonb_build_object('old', OLD.tp_hits, 'new', NEW.tp_hits, 'new_hits', new_tp_count));
    END IF;

    -- Manual close
    IF OLD.close_reason IS DISTINCT FROM NEW.close_reason AND NEW.close_reason IS NOT NULL THEN
      change_types := array_append(change_types, 'manual_close');
      is_significant_change := true;
      priority_level := 2;
      should_send_notification := true;
      actual_changes := actual_changes || jsonb_build_object('close_reason', jsonb_build_object('old', OLD.close_reason, 'new', NEW.close_reason));
    END IF;

    -- Block if no significant changes
    IF NOT is_significant_change OR NOT should_send_notification OR array_length(change_types, 1) = 0 THEN
      RETURN NEW;
    END IF;

    IF is_system_op THEN
      change_source := 'system_update';
    END IF;
  END IF;

  -- FIX #4: Fetch author profile with validation
  SELECT 
    COALESCE(NULLIF(trim(p.display_name), ''), 'Unknown Trader') as display_name, 
    p.avatar_url
  INTO author_profile
  FROM public.profiles p 
  WHERE p.id = NEW.user_id;

  IF author_profile.display_name IS NULL THEN
    author_profile.display_name := 'Unknown Trader';
    author_profile.avatar_url := NULL;
  END IF;

  -- FIX #6: Validate data before sending
  IF safe_asset_name = 'Unknown Asset' OR NEW.entry_price IS NULL OR author_profile.display_name IS NULL THEN
    INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
    VALUES ('enhanced_notification_pipeline_v2', NOW(), 0, 'validation_failed',
            'Notification blocked - Invalid data: asset=' || safe_asset_name);
    RETURN NEW;
  END IF;

  -- Calculate pips
  pip_size := CASE 
    WHEN NEW.tradermade_symbol LIKE '%JPY%' THEN 0.01
    WHEN NEW.tradermade_symbol LIKE '%XAU%' OR NEW.tradermade_symbol LIKE '%GOLD%' THEN 0.1
    WHEN NEW.tradermade_symbol LIKE '%BTC%' THEN 1.0
    ELSE 0.0001
  END;
  calculated_pips := 0;

  -- Get eligible users
  SELECT array_agg(p.id) INTO eligible_users
  FROM public.profiles p
  LEFT JOIN public.notification_preferences np ON p.id = np.user_id
  WHERE p.account_status = 'active'
  AND p.push_subscription_active = true
  AND p.onesignal_player_id IS NOT NULL
  AND p.id != NEW.user_id
  AND p.onesignal_player_id != 'dev_mock_player_id'
  AND length(p.onesignal_player_id) >= 36;

  IF eligible_users IS NULL OR array_length(eligible_users, 1) = 0 THEN
    RETURN NEW;
  END IF;

  -- Build notification payload
  notification_payload := jsonb_build_object(
    'notifications', jsonb_build_array(
      jsonb_build_object(
        'signal_id', NEW.id,
        'user_id', NEW.user_id,
        'asset_name', safe_asset_name,
        'trade_type', NEW.trade_type,
        'entry_price', NEW.entry_price,
        'stop_loss', NEW.stop_loss,
        'tp1', NEW.tp1, 'tp2', NEW.tp2, 'tp3', NEW.tp3, 'tp4', NEW.tp4, 'tp5', NEW.tp5,
        'symbol', NEW.tradermade_symbol,
        'tradermade_symbol', NEW.tradermade_symbol,
        'created_at', NEW.created_at,
        'updated_at', NEW.updated_at,
        'notification_type', CASE 
          WHEN TG_OP = 'INSERT' THEN 'signal_created'
          WHEN 'limit_order_activated' = ANY(change_types) THEN 'limit_order_activated'
          WHEN 'multiple_tps_hit' = ANY(change_types) THEN 'multiple_tps_hit'
          WHEN 'tp_hits' = ANY(change_types) THEN 'tp_hit'
          WHEN 'manual_close' = ANY(change_types) THEN 'manual_close'
          WHEN NEW.status = 'closed' THEN 'signal_closed'
          ELSE 'signal_updated'
        END,
        'status', NEW.status,
        'tp_hits', NEW.tp_hits,
        'close_reason', NEW.close_reason,
        'change_types', change_types,
        'actual_changes', actual_changes,
        'priority_level', priority_level,
        'author_id', NEW.user_id,
        'author_name', author_profile.display_name,
        'author_avatar_url', author_profile.avatar_url,
        'delivery_channels', ARRAY['push', 'in_app'],
        'user_ids', eligible_users,
        'pip_calculation', jsonb_build_object('pip_size', pip_size, 'new_tp_count', new_tp_count)
      )
    )
  );

  -- Send notification
  BEGIN
    SELECT net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := notification_payload,
      timeout_milliseconds := 20000
    ) INTO request_id;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  RETURN NEW;
END;
$function$;