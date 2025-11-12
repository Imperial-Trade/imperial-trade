-- ===================================================================
-- COPY THIS ENTIRE FILE TO SUPABASE SQL EDITOR AND RUN IT
-- ===================================================================
-- This will fix the duplicate notifications and missing modern notifications
-- Date: November 9, 2025
-- ===================================================================

CREATE OR REPLACE FUNCTION public.enhanced_notification_pipeline_v2()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  change_types TEXT[] := '{}';
  is_significant_change BOOLEAN := false;
  priority_level INTEGER := 1;
  change_source TEXT := 'user_action';
  should_send_notification BOOLEAN := false;
  actual_changes JSONB := '{}';
  
  -- ✅ NEW: Two separate user arrays
  all_authenticated_users UUID[];  -- For modern notifications (everyone)
  push_enabled_users UUID[];        -- For push notifications (opt-in only)
  
  notification_payload JSONB;
  service_role_key TEXT;
  function_url TEXT;
  author_profile RECORD;
  request_id BIGINT;
  safe_asset_name TEXT;
  is_system_op BOOLEAN := false;

  pip_size NUMERIC;
  calculated_pips NUMERIC := 0;
  new_tp_count INTEGER := 0;

  current_market_price NUMERIC;
  pips_value NUMERIC;
  pips_string TEXT;
  tp_number INTEGER;
  total_tps INTEGER;
  author_user_type TEXT;
  
  -- Deduplication variables
  v_change_hash TEXT; -- Renamed to avoid ambiguity with column name
  last_fired TIMESTAMP WITH TIME ZONE;
  dedup_threshold INTERVAL := '2 seconds';
  event_key TEXT;
  tp_price NUMERIC;
  
  -- ✅ NEW: Variable to safely hold config value
  system_op_setting TEXT;
BEGIN
  service_role_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg2OTI1MCwiZXhwIjoyMDY3NDQ1MjUwfQ.0tHLp8yWK_lNP_6yrdNn4BqM3kGlWnKMcDf9fYMa2hU';
  function_url := 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/enhanced-signal-notification-dispatcher';

  safe_asset_name := COALESCE(NULLIF(trim(NEW.asset_name), ''), 'Unknown Asset');

  -- Build change hash for deduplication
  IF TG_OP = 'INSERT' THEN
    change_hash := 'insert_' || NEW.id::text || '_' || NEW.trade_type;
  ELSIF TG_OP = 'UPDATE' THEN
    change_hash := 'update_' || NEW.id::text || '_' || 
                   COALESCE(NEW.status::text, 'null') || '_' ||
                   COALESCE(array_to_string(NEW.tp_hits, ','), 'null') || '_' ||
                   COALESCE(NEW.close_reason::text, 'null');
  END IF;

  -- Check if we've already processed this change recently
  SELECT last_fired_at INTO last_fired
  FROM public.trigger_notification_dedup
  WHERE signal_id = NEW.id AND change_hash = change_hash;

  IF last_fired IS NOT NULL AND (NOW() - last_fired) < dedup_threshold THEN
    RAISE NOTICE '🚫 [Trigger Dedup] Blocked duplicate for signal % (last_fired: %s ago)',
      NEW.id, EXTRACT(EPOCH FROM (NOW() - last_fired));
    RETURN NEW;
  END IF;

  -- Record this change
  INSERT INTO public.trigger_notification_dedup (signal_id, change_hash, last_fired_at)
  VALUES (NEW.id, change_hash, NOW())
  ON CONFLICT (signal_id, change_hash) 
  DO UPDATE SET last_fired_at = NOW();

  -- INSERT detection
  IF TG_OP = 'INSERT' THEN
    IF NEW.trade_type IN ('buy_limit', 'sell_limit') THEN
      change_types := array_append(change_types, 'pending_limit_created');
      event_key := NEW.id::text || '-pending_limit_created-' || extract(epoch from now())::bigint::text;
    ELSE
      change_types := array_append(change_types, 'signal_created');
      event_key := NEW.id::text || '-signal_created-' || extract(epoch from now())::bigint::text;
    END IF;

    is_significant_change := true;
    priority_level := 2;
    change_source := 'signal_creation';
    should_send_notification := true;
    actual_changes := jsonb_build_object(
      'type', 'new_signal',
      'signal_id', NEW.id,
      'creation_time', NEW.created_at,
      'trade_type', NEW.trade_type
    );

  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      change_types := array_append(change_types, 'status_change');

      IF OLD.status = 'pending' AND NEW.status = 'active' AND
         (NEW.trade_type = 'buy_limit' OR NEW.trade_type = 'sell_limit') THEN
        change_types := array_append(change_types, 'limit_order_activated');
        is_significant_change := true;
        priority_level := 2;
        should_send_notification := true;
        event_key := NEW.id::text || '-limit_activated-' || extract(epoch from now())::bigint::text;
        actual_changes := actual_changes || jsonb_build_object(
          'limit_activated', jsonb_build_object(
            'from_status', OLD.status,
            'to_status', NEW.status,
            'trade_type', NEW.trade_type,
            'activated_at', NEW.updated_at
          )
        );
      END IF;
    END IF;

    IF OLD.tp_hits IS DISTINCT FROM NEW.tp_hits THEN
      new_tp_count := COALESCE(array_length(NEW.tp_hits, 1), 0) - COALESCE(array_length(OLD.tp_hits, 1), 0);
      
      IF array_length(NEW.tp_hits, 1) > 0 THEN
        tp_number := NEW.tp_hits[array_length(NEW.tp_hits, 1)];
        
        tp_price := CASE tp_number
          WHEN 1 THEN NEW.tp1
          WHEN 2 THEN NEW.tp2
          WHEN 3 THEN NEW.tp3
          WHEN 4 THEN NEW.tp4
          WHEN 5 THEN NEW.tp5
          ELSE NULL
        END;
        
        IF tp_price IS NOT NULL THEN
          event_key := 'signal_' || NEW.id::text || '_tp_hit_' || tp_number::text || '_' || 
                      (ROUND(tp_price * 100))::bigint::text;
        ELSE
          event_key := NEW.id::text || '-tp_hit-' || extract(epoch from now())::bigint::text;
        END IF;
      END IF;

      IF new_tp_count > 1 THEN
        change_types := array_append(change_types, 'multiple_tps_hit');
      ELSE
        change_types := array_append(change_types, 'tp_hits');
      END IF;

      is_significant_change := true;
      priority_level := 2;
      should_send_notification := true;
      actual_changes := actual_changes || jsonb_build_object(
        'tp_hits', jsonb_build_object(
          'old', OLD.tp_hits,
          'new', NEW.tp_hits,
          'new_hits_count', new_tp_count,
          'tp_number', tp_number,
          'hit_at', NEW.updated_at
        )
      );
    END IF;

    IF OLD.close_reason IS DISTINCT FROM NEW.close_reason AND NEW.close_reason IS NOT NULL THEN
      IF NEW.close_reason = 'stop_loss' THEN
        change_types := array_append(change_types, 'stop_loss_hit');
        is_significant_change := true;
        priority_level := 3;
        should_send_notification := true;
        event_key := NEW.id::text || '-stop_loss-' || extract(epoch from now())::bigint::text;
      ELSIF NEW.close_reason = 'all_tps_hit' THEN
        change_types := array_append(change_types, 'all_tps_hit');
        is_significant_change := true;
        priority_level := 2;
        should_send_notification := true;
        event_key := NEW.id::text || '-all_tps_hit-' || extract(epoch from now())::bigint::text;
      ELSIF NEW.close_reason = 'manual' THEN
        change_types := array_append(change_types, 'manual_close');
        is_significant_change := true;
        priority_level := 2;
        should_send_notification := true;
        event_key := NEW.id::text || '-manual_close-' || extract(epoch from now())::bigint::text;
      END IF;

      actual_changes := actual_changes || jsonb_build_object(
        'close_reason', jsonb_build_object(
          'old', OLD.close_reason,
          'new', NEW.close_reason,
          'changed_at', NEW.updated_at
        )
      );
    END IF;

    IF OLD.notes IS DISTINCT FROM NEW.notes AND NEW.notes IS NOT NULL THEN
      change_types := array_append(change_types, 'notes_updated');
      is_significant_change := true;
      priority_level := 1;
      should_send_notification := true;
      event_key := NEW.id::text || '-notes_updated-' || extract(epoch from now())::bigint::text;
      actual_changes := actual_changes || jsonb_build_object(
        'notes', jsonb_build_object(
          'old', OLD.notes,
          'new', NEW.notes,
          'updated_at', NEW.updated_at
        )
      );
    END IF;

    IF OLD.entry_price IS DISTINCT FROM NEW.entry_price AND
       ABS(NEW.entry_price - OLD.entry_price) / OLD.entry_price > 0.001 THEN
      change_types := array_append(change_types, 'entry_price_update');
      is_significant_change := true;
      priority_level := 1;
      should_send_notification := true;
      event_key := NEW.id::text || '-entry_price_update-' || extract(epoch from now())::bigint::text;
      actual_changes := actual_changes || jsonb_build_object(
        'entry_price', jsonb_build_object(
          'old', OLD.entry_price,
          'new', NEW.entry_price,
          'change_percent', ((NEW.entry_price - OLD.entry_price) / OLD.entry_price * 100),
          'changed_at', NEW.updated_at
        )
      );
    END IF;

    -- ✅ CRITICAL FIX: Safely check for system operation setting
    BEGIN
      system_op_setting := current_setting('app.is_system_operation', true);
      IF system_op_setting IS NOT NULL AND system_op_setting != '' THEN
        is_system_op := system_op_setting::boolean;
      ELSE
        is_system_op := false;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        is_system_op := false;
    END;

    IF is_system_op THEN
      change_source := 'system_update';
    END IF;
  END IF;

  -- Early return if no significant changes
  IF NOT is_significant_change OR array_length(change_types, 1) = 0 THEN
    RETURN NEW;
  END IF;

  -- Fetch author profile
  SELECT
    COALESCE(NULLIF(trim(p.display_name), ''), 'Unknown Trader') as display_name,
    p.avatar_url,
    p.user_type::text as user_type
  INTO author_profile
  FROM public.profiles p
  WHERE p.id = NEW.user_id;

  IF author_profile.display_name IS NULL THEN
    author_profile.display_name := 'Unknown Trader';
    author_profile.avatar_url := NULL;
    author_profile.user_type := 'user';
  END IF;

  author_user_type := COALESCE(author_profile.user_type, 'user');

  -- Get current market price
  SELECT mid INTO current_market_price
  FROM public.market_prices
  WHERE symbol = NEW.tradermade_symbol
  ORDER BY updated_at DESC
  LIMIT 1;

  current_market_price := COALESCE(current_market_price, NEW.entry_price);

  -- Calculate pip size
  pip_size := CASE
    WHEN NEW.tradermade_symbol LIKE '%JPY%' THEN 0.01
    WHEN NEW.tradermade_symbol LIKE '%XAU%' OR NEW.tradermade_symbol LIKE '%GOLD%' THEN 0.1
    WHEN NEW.tradermade_symbol LIKE '%BTC%' THEN 1.0
    WHEN NEW.tradermade_symbol LIKE '%US30%' OR NEW.tradermade_symbol LIKE '%US100%' THEN 1.0
    ELSE 0.0001
  END;

  -- Calculate pips
  IF 'tp_hits' = ANY(change_types) OR 'multiple_tps_hit' = ANY(change_types) OR
     NEW.close_reason IN ('all_tps_hit', 'stop_loss') THEN

    IF NEW.trade_type IN ('buy', 'buy_limit') THEN
      pips_value := (current_market_price - NEW.entry_price) / pip_size;
    ELSE
      pips_value := (NEW.entry_price - current_market_price) / pip_size;
    END IF;

    calculated_pips := ROUND(pips_value, 1);

    IF calculated_pips >= 0 THEN
      pips_string := '+' || calculated_pips::text;
    ELSE
      pips_string := calculated_pips::text;
    END IF;
  END IF;

  total_tps := (
    CASE WHEN NEW.tp1 IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN NEW.tp2 IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN NEW.tp3 IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN NEW.tp4 IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN NEW.tp5 IS NOT NULL THEN 1 ELSE 0 END
  );

  -- ✅ CRITICAL FIX: Two separate user selections
  
  -- 1. ALL authenticated users for modern notifications (in-app)
  SELECT ARRAY_AGG(id) INTO all_authenticated_users
  FROM public.profiles
  WHERE account_status = 'active';
  
  -- 2. Only push-enabled users for push notifications
  SELECT ARRAY_AGG(id) INTO push_enabled_users
  FROM public.profiles
  WHERE account_status = 'active'
    AND push_subscription_active = true
    AND onesignal_player_id IS NOT NULL
    AND onesignal_subscription_status IN ('subscribed', 'subscribed_dev');

  -- Log user counts
  RAISE NOTICE '📋 [Trigger] Signal %: % total users, % push-enabled', 
    NEW.id, 
    COALESCE(array_length(all_authenticated_users, 1), 0),
    COALESCE(array_length(push_enabled_users, 1), 0);

  -- Build notification payload
  notification_payload := jsonb_build_object(
    'notifications', jsonb_build_array(
      jsonb_build_object(
        'id', gen_random_uuid(),
        'signal_id', NEW.id,
        'user_id', NEW.user_id,
        'asset_name', safe_asset_name,
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
          WHEN TG_OP = 'INSERT' AND (NEW.trade_type = 'buy_limit' OR NEW.trade_type = 'sell_limit')
            THEN 'pending_limit_created'
          WHEN TG_OP = 'INSERT'
            THEN 'signal_created'
          WHEN 'stop_loss_hit' = ANY(change_types) OR (NEW.status = 'closed' AND NEW.close_reason = 'stop_loss')
            THEN 'stop_loss_hit'
          WHEN 'all_tps_hit' = ANY(change_types) OR (NEW.status = 'closed' AND NEW.close_reason = 'all_tps_hit')
            THEN 'all_tps_hit'
          WHEN 'manual_close' = ANY(change_types) OR (NEW.status = 'closed' AND NEW.close_reason = 'manual')
            THEN 'manual_close'
          WHEN 'limit_order_activated' = ANY(change_types)
            THEN 'limit_activated'
          WHEN 'multiple_tps_hit' = ANY(change_types)
            THEN 'tp_hit'
          WHEN 'tp_hits' = ANY(change_types)
            THEN 'tp_hit'
          WHEN 'notes_updated' = ANY(change_types)
            THEN 'notes_updated'
          WHEN NEW.status = 'closed'
            THEN 'signal_closed'
          ELSE 'signal_updated'
        END,

        'event_key', event_key,
        'alert_type', CASE
          WHEN TG_OP = 'INSERT' THEN 'signal_created'
          ELSE 'signal_updated'
        END,
        'target_price', NEW.entry_price,
        'triggered_price', current_market_price,
        'pips', pips_string,
        'pips_gained', pips_string,
        'pips_value', calculated_pips,
        'tp_number', tp_number,
        'total_tps', total_tps,
        'status', NEW.status,
        'tp_hits', NEW.tp_hits,
        'close_reason', NEW.close_reason,
        'notes', NEW.notes,
        'change_types', change_types,
        'actual_changes', actual_changes,
        'change_source', change_source,
        'priority_level', priority_level,
        'author_id', NEW.user_id,
        'author_name', author_profile.display_name,
        'author_avatar_url', author_profile.avatar_url,
        'author_user_type', author_user_type,

        -- ✅ NEW: Two separate delivery configs
        'delivery_channels', ARRAY['in_app', 'push'],
        'user_ids', all_authenticated_users,              -- All users for in-app
        'push_user_ids', push_enabled_users,              -- Only push-enabled for push
        'include_creator', true,
        
        'pip_calculation', jsonb_build_object(
          'pip_size', pip_size,
          'calculated_pips', calculated_pips,
          'new_tp_count', new_tp_count
        ),
        'validation_metadata', jsonb_build_object(
          'trigger_timestamp', now(),
          'deduplication_enabled', true,
          'change_hash', change_hash,
          'event_key', event_key,
          'safe_asset_name', safe_asset_name,
          'safe_author_name', author_profile.display_name,
          'all_users_count', COALESCE(array_length(all_authenticated_users, 1), 0),
          'push_users_count', COALESCE(array_length(push_enabled_users, 1), 0)
        )
      )
    )
  );

  -- Send HTTP request
  RAISE NOTICE '📤 [Trigger] Sending notification for signal % (event_key: %, all_users: %, push_users: %)', 
    NEW.id, event_key, 
    COALESCE(array_length(all_authenticated_users, 1), 0),
    COALESCE(array_length(push_enabled_users, 1), 0);

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

    IF request_id IS NULL THEN
      RAISE WARNING '❌ [Trigger] HTTP POST failed for signal %', NEW.id;
    ELSE
      RAISE NOTICE '✅ [Trigger] HTTP POST successful - request_id: %', request_id;
    END IF;

  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '❌ [Trigger] HTTP POST exception: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
  END;

  RETURN NEW;
END;
$function$;

-- Add comment
COMMENT ON FUNCTION public.enhanced_notification_pipeline_v2() IS 
'Final version: ALL authenticated users see modern notifications, only push-enabled users get push.
Features:
- Database-level deduplication (2s threshold)
- Modern notifications sent to ALL active users
- Push notifications only to users with push_subscription_active=true
- Consistent event keys matching frontend format
- Enhanced logging for debugging';

