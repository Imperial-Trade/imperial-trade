-- ============================================
-- PHASE 1: Fix Database Trigger Execution with Comprehensive Logging
-- ============================================

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
  notification_type TEXT;
BEGIN
  -- ✅ LOG ENTRY POINT
  INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
  VALUES ('enhanced_notification_pipeline_v2', NOW(), 0, 'trigger_started', 
          'Signal: ' || NEW.id::text || ' | Op: ' || TG_OP || ' | Asset: ' || COALESCE(NEW.asset_name, 'unknown'));

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
    -- ✅ LOG AUTHORIZATION FAILURE
    INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
    VALUES ('enhanced_notification_pipeline_v2', NOW(), 0, 'auth_blocked', 
            'User ' || NEW.user_id::text || ' not authorized for signal: ' || NEW.id::text);
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
    time_since_last_update := NEW.updated_at - OLD.updated_at;
    
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      IF time_since_last_update < interval '3 seconds' AND OLD.status = NEW.status THEN
        INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
        VALUES ('enhanced_notification_pipeline_v2', NOW(), 0, 'blocked_rapid_change', 
                'Blocked rapid status change for signal: ' || safe_asset_name);
        RETURN NEW;
      END IF;
      
      IF OLD.status = 'pending' AND NEW.status = 'active' AND 
         (NEW.trade_type = 'buy_limit' OR NEW.trade_type = 'sell_limit') AND
         OLD.activated_at IS NULL THEN
        change_types := array_append(change_types, 'limit_order_activated');
      ELSIF NEW.status != OLD.status THEN
        change_types := array_append(change_types, 'status_change');
      END IF;
      
      is_significant_change := true;
      priority_level := CASE WHEN NEW.status = 'closed' THEN 3 WHEN NEW.status = 'active' THEN 2 ELSE 1 END;
      should_send_notification := true;
      actual_changes := actual_changes || jsonb_build_object('status_change', jsonb_build_object('old', OLD.status, 'new', NEW.status));
    END IF;

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

    IF OLD.close_reason IS DISTINCT FROM NEW.close_reason AND NEW.close_reason IS NOT NULL THEN
      change_types := array_append(change_types, 'manual_close');
      is_significant_change := true;
      priority_level := 2;
      should_send_notification := true;
      actual_changes := actual_changes || jsonb_build_object('close_reason', jsonb_build_object('old', OLD.close_reason, 'new', NEW.close_reason));
    END IF;

    IF NOT is_significant_change OR NOT should_send_notification OR array_length(change_types, 1) = 0 THEN
      INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
      VALUES ('enhanced_notification_pipeline_v2', NOW(), 0, 'no_significant_changes', 
              'Signal: ' || NEW.id::text || ' | Changes: ' || array_to_string(change_types, ', '));
      RETURN NEW;
    END IF;

    IF is_system_op THEN
      change_source := 'system_update';
    END IF;
  END IF;

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

  IF safe_asset_name = 'Unknown Asset' OR NEW.entry_price IS NULL OR author_profile.display_name IS NULL THEN
    INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
    VALUES ('enhanced_notification_pipeline_v2', NOW(), 0, 'validation_failed',
            'Notification blocked - Invalid data: asset=' || safe_asset_name);
    RETURN NEW;
  END IF;

  pip_size := CASE 
    WHEN NEW.tradermade_symbol LIKE '%JPY%' THEN 0.01
    WHEN NEW.tradermade_symbol LIKE '%XAU%' OR NEW.tradermade_symbol LIKE '%GOLD%' THEN 0.1
    WHEN NEW.tradermade_symbol LIKE '%BTC%' THEN 1.0
    ELSE 0.0001
  END;
  calculated_pips := 0;

  SELECT array_agg(p.id) INTO eligible_users
  FROM public.profiles p
  LEFT JOIN public.notification_preferences np ON p.id = np.user_id
  WHERE p.account_status = 'active'
  AND p.push_subscription_active = true
  AND p.onesignal_player_id IS NOT NULL
  AND p.id != NEW.user_id
  AND p.onesignal_player_id != 'dev_mock_player_id'
  AND length(p.onesignal_player_id) >= 36;

  -- ✅ LOG ELIGIBLE USERS CHECK
  IF eligible_users IS NULL OR array_length(eligible_users, 1) = 0 THEN
    INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
    VALUES ('enhanced_notification_pipeline_v2', NOW(), 0, 'no_eligible_users', 
            'Signal: ' || NEW.id::text || ' | No users to notify');
    RETURN NEW;
  END IF;

  notification_type := CASE 
    WHEN TG_OP = 'INSERT' THEN 'signal_created'
    WHEN 'limit_order_activated' = ANY(change_types) THEN 'limit_order_activated'
    WHEN 'multiple_tps_hit' = ANY(change_types) THEN 'multiple_tps_hit'
    WHEN 'tp_hits' = ANY(change_types) THEN 'tp_hit'
    WHEN 'manual_close' = ANY(change_types) THEN 'manual_close'
    WHEN NEW.status = 'closed' THEN 'signal_closed'
    ELSE 'signal_updated'
  END;

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
        'notification_type', notification_type,
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

  -- ✅ LOG BEFORE HTTP POST
  INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
  VALUES ('enhanced_notification_pipeline_v2', NOW(), array_length(eligible_users, 1), 'sending_notification', 
          'Signal: ' || NEW.id::text || ' | Type: ' || notification_type || ' | Users: ' || array_length(eligible_users, 1)::text);

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
    
    -- ✅ LOG SUCCESS
    INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
    VALUES ('enhanced_notification_pipeline_v2', NOW(), array_length(eligible_users, 1), 'success', 
            'Request ID: ' || COALESCE(request_id::text, 'null') || ' | Signal: ' || NEW.id::text);
  EXCEPTION WHEN OTHERS THEN
    -- ✅ LOG HTTP FAILURE
    INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
    VALUES ('enhanced_notification_pipeline_v2', NOW(), 0, 'http_error', 
            'Signal: ' || NEW.id::text || ' | Error: ' || SQLERRM);
  END;
  
  RETURN NEW;
END;
$function$;

-- ============================================
-- PHASE 1: Add Guardrails for Closed Signals
-- ============================================

CREATE OR REPLACE FUNCTION public.set_activation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- ✅ PREVENT RE-OPENING CLOSED SIGNALS
    IF OLD.status = 'closed' AND NEW.status != 'closed' THEN
      INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
      VALUES ('set_activation_timestamp', NOW(), 0, 'blocked_reopen', 
              'Blocked attempt to re-open closed signal: ' || OLD.id::text);
      RAISE EXCEPTION 'Cannot re-open a closed signal (ID: %)', OLD.id;
    END IF;
    
    -- ✅ PREVENT REVERSION FROM ACTIVE TO PENDING
    IF OLD.status = 'active' AND NEW.status = 'pending' AND OLD.activated_at IS NOT NULL THEN
      INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
      VALUES ('set_activation_timestamp', NOW(), 0, 'blocked_reversion', 
              'Blocked attempt to revert active to pending: ' || OLD.id::text);
      RAISE EXCEPTION 'Cannot revert signal status from active to pending after activation';
    END IF;
    
    IF OLD.status = 'pending' AND NEW.status = 'active' THEN
      NEW.activated_at = now();
      NEW.activation_price = NEW.entry_price;
      
      -- ✅ LOG ACTIVATION
      INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
      VALUES ('set_activation_timestamp', NOW(), 1, 'activated', 
              'Signal: ' || NEW.id::text || ' | Entry: ' || NEW.entry_price::text || ' | Type: ' || NEW.trade_type);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================
-- PHASE 3: Make Limit Order Activation INSTANT
-- ============================================

CREATE OR REPLACE FUNCTION public.instant_limit_order_activation()
RETURNS TRIGGER AS $$
DECLARE
  buy_limit_activated INTEGER := 0;
  sell_limit_activated INTEGER := 0;
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (OLD.mid IS DISTINCT FROM NEW.mid OR OLD.bid IS DISTINCT FROM NEW.bid OR OLD.ask IS DISTINCT FROM NEW.ask)) THEN
    
    -- ✅ INSTANT BUY LIMIT ACTIVATION (market drops to or below entry price)
    WITH activated_buy_limits AS (
      UPDATE public.trade_alerts
      SET status = 'active'
      WHERE status = 'pending'
        AND trade_type = 'buy_limit'
        AND tradermade_symbol = NEW.symbol
        AND entry_price >= COALESCE(NEW.ask, NEW.mid, NEW.bid)
        AND activated_at IS NULL
      RETURNING id
    )
    SELECT count(*) INTO buy_limit_activated FROM activated_buy_limits;
    
    -- ✅ INSTANT SELL LIMIT ACTIVATION (market rises to or above entry price)
    WITH activated_sell_limits AS (
      UPDATE public.trade_alerts
      SET status = 'active'
      WHERE status = 'pending'
        AND trade_type = 'sell_limit'
        AND tradermade_symbol = NEW.symbol
        AND entry_price <= COALESCE(NEW.bid, NEW.mid, NEW.ask)
        AND activated_at IS NULL
      RETURNING id
    )
    SELECT count(*) INTO sell_limit_activated FROM activated_sell_limits;
      
    -- ✅ LOG ACTIVATIONS
    IF buy_limit_activated > 0 OR sell_limit_activated > 0 THEN
      INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
      VALUES ('instant_limit_order_activation', NOW(), 
              buy_limit_activated + sell_limit_activated,
              'success', 
              'Symbol: ' || NEW.symbol || ' | Price: ' || COALESCE(NEW.mid, NEW.bid, NEW.ask)::text || 
              ' | Buy Limits: ' || buy_limit_activated::text || ' | Sell Limits: ' || sell_limit_activated::text);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ✅ ATTACH TRIGGER TO market_prices TABLE
DROP TRIGGER IF EXISTS instant_limit_order_activation_trigger ON public.market_prices;
CREATE TRIGGER instant_limit_order_activation_trigger
  AFTER INSERT OR UPDATE OF mid, bid, ask ON public.market_prices
  FOR EACH ROW
  EXECUTE FUNCTION public.instant_limit_order_activation();