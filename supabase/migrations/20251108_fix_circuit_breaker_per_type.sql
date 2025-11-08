-- ============================================
-- FIX CIRCUIT BREAKER: Track by signal_id + notification_type
-- ============================================
-- This fixes the issue where ALL notifications for a signal
-- were blocked for 60 seconds after ANY notification was sent.
-- 
-- Now the circuit breaker tracks separately for each notification type:
-- - signal_created
-- - tp_hit
-- - stop_loss_hit
-- - manual_close
-- etc.
-- ============================================

-- First, update the notification_circuit_breaker table structure
-- to include notification_type in the composite key
DROP INDEX IF EXISTS idx_circuit_breaker_signal_user;

-- Add notification_type column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notification_circuit_breaker'
    AND column_name = 'notification_type'
  ) THEN
    ALTER TABLE public.notification_circuit_breaker 
    ADD COLUMN notification_type TEXT DEFAULT 'unknown';
  END IF;
END $$;

-- Create new composite index for signal_id + user_id + notification_type
CREATE INDEX IF NOT EXISTS idx_circuit_breaker_signal_user_type 
ON public.notification_circuit_breaker(signal_id, user_id, notification_type, last_sent_at DESC);

-- Update the checkCircuitBreaker function in the Edge Function
-- to include notification_type in the query
COMMENT ON TABLE public.notification_circuit_breaker IS 
'Circuit breaker now tracks per signal_id + user_id + notification_type. Window: 60 seconds.';

-- Clean up old circuit breaker records (older than 5 minutes)
DELETE FROM public.notification_circuit_breaker 
WHERE last_sent_at < NOW() - INTERVAL '5 minutes';

-- ============================================
-- UPDATE: Enhanced Notification Pipeline v2
-- ============================================
-- This function now passes notification_type to the Edge Function
-- so it can properly track circuit breaker per type

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
  eligible_users UUID[];
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
  determined_notification_type TEXT;
BEGIN
  service_role_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg2OTI1MCwiZXhwIjoyMDY3NDQ1MjUwfQ.0tHLp8yWK_lNP_6yrdNn4BqM3kGlWnKMcDf9fYMa2hU';
  function_url := 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/enhanced-signal-notification-dispatcher';

  safe_asset_name := COALESCE(NULLIF(trim(NEW.asset_name), ''), 'Unknown Asset');

  -- INSERT detection
  IF TG_OP = 'INSERT' THEN
    IF NEW.trade_type IN ('buy_limit', 'sell_limit') THEN
      change_types := array_append(change_types, 'pending_limit_created');
      determined_notification_type := 'pending_limit_created';
    ELSE
      change_types := array_append(change_types, 'signal_created');
      determined_notification_type := 'signal_created';
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
        determined_notification_type := 'limit_activated';
        is_significant_change := true;
        priority_level := 2;
        should_send_notification := true;
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

      IF new_tp_count > 1 THEN
        change_types := array_append(change_types, 'multiple_tps_hit');
      ELSE
        change_types := array_append(change_types, 'tp_hits');
      END IF;

      determined_notification_type := 'tp_hit';
      is_significant_change := true;
      priority_level := 2;
      should_send_notification := true;
      actual_changes := actual_changes || jsonb_build_object(
        'tp_hits', jsonb_build_object(
          'old', OLD.tp_hits,
          'new', NEW.tp_hits,
          'new_hits_count', new_tp_count,
          'hit_at', NEW.updated_at
        )
      );
    END IF;

    IF OLD.close_reason IS DISTINCT FROM NEW.close_reason AND NEW.close_reason IS NOT NULL THEN
      IF NEW.close_reason = 'stop_loss' THEN
        change_types := array_append(change_types, 'stop_loss_hit');
        determined_notification_type := 'stop_loss_hit';
        is_significant_change := true;
        priority_level := 3;
        should_send_notification := true;
      ELSIF NEW.close_reason = 'all_tps_hit' THEN
        change_types := array_append(change_types, 'all_tps_hit');
        determined_notification_type := 'all_tps_hit';
        is_significant_change := true;
        priority_level := 2;
        should_send_notification := true;
      ELSIF NEW.close_reason = 'manual' THEN
        change_types := array_append(change_types, 'manual_close');
        determined_notification_type := 'manual_close';
        is_significant_change := true;
        priority_level := 2;
        should_send_notification := true;
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
      determined_notification_type := 'notes_updated';
      is_significant_change := true;
      priority_level := 1;
      should_send_notification := true;
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
      determined_notification_type := 'entry_price_update';
      is_significant_change := true;
      priority_level := 1;
      should_send_notification := true;
      actual_changes := actual_changes || jsonb_build_object(
        'entry_price', jsonb_build_object(
          'old', OLD.entry_price,
          'new', NEW.entry_price,
          'change_percent', ((NEW.entry_price - OLD.entry_price) / OLD.entry_price * 100),
          'changed_at', NEW.updated_at
        )
      );
    END IF;

    BEGIN
      is_system_op := current_setting('app.is_system_operation')::boolean;
    EXCEPTION
      WHEN undefined_object THEN
        is_system_op := false;
      WHEN invalid_text_representation THEN
        is_system_op := false;
    END;

    IF is_system_op THEN
      change_source := 'system_update';
    END IF;
  END IF;

  -- Skip if no significant changes
  IF NOT should_send_notification THEN
    RETURN NEW;
  END IF;

  -- ✅ Fetch author profile
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

  SELECT mid INTO current_market_price
  FROM public.market_prices
  WHERE symbol = NEW.tradermade_symbol
  ORDER BY updated_at DESC
  LIMIT 1;

  current_market_price := COALESCE(current_market_price, NEW.entry_price);

  pip_size := CASE
    WHEN NEW.tradermade_symbol LIKE '%JPY%' THEN 0.01
    WHEN NEW.tradermade_symbol LIKE '%XAU%' OR NEW.tradermade_symbol LIKE '%GOLD%' THEN 0.1
    WHEN NEW.tradermade_symbol LIKE '%BTC%' THEN 1.0
    WHEN NEW.tradermade_symbol LIKE '%US30%' OR NEW.tradermade_symbol LIKE '%US100%' THEN 1.0
    ELSE 0.0001
  END;

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

  IF ('tp_hits' = ANY(change_types) OR 'multiple_tps_hit' = ANY(change_types)) AND
     array_length(NEW.tp_hits, 1) > 0 THEN
    tp_number := NEW.tp_hits[array_length(NEW.tp_hits, 1)];
  END IF;

  total_tps := (
    CASE WHEN NEW.tp1 IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN NEW.tp2 IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN NEW.tp3 IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN NEW.tp4 IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN NEW.tp5 IS NOT NULL THEN 1 ELSE 0 END
  );

  SELECT ARRAY_AGG(user_id) INTO eligible_users
  FROM public.signal_subscriptions
  WHERE provider_id = NEW.user_id
    AND is_active = true;

  -- ✅ CRITICAL: Include notification_type in payload for circuit breaker
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

        'notification_type', determined_notification_type,

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
        'delivery_channels', ARRAY['push', 'in_app'],
        'user_ids', eligible_users,
        'include_creator', false,
        'pip_calculation', jsonb_build_object(
          'pip_size', pip_size,
          'calculated_pips', calculated_pips,
          'new_tp_count', new_tp_count
        ),
        'validation_metadata', jsonb_build_object(
          'trigger_timestamp', now(),
          'bugs_fixed', ARRAY['circuit_breaker_per_type'],
          'safe_asset_name', safe_asset_name,
          'safe_author_name', author_profile.display_name
        )
      )
    )
  );

  RAISE NOTICE '📤 [Trigger] Sending notification for signal % - Type: %', NEW.id, determined_notification_type;

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
      RAISE WARNING '❌ [Trigger] HTTP POST failed - no request_id returned for signal %', NEW.id;
    ELSE
      RAISE NOTICE '✅ [Trigger] HTTP POST successful - request_id: % for signal %', request_id, NEW.id;
    END IF;

  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '❌ [Trigger] HTTP POST exception for signal %: % (SQLSTATE: %)', NEW.id, SQLERRM, SQLSTATE;
  END;

  RETURN NEW;
END;
$function$;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$ 
BEGIN
  RAISE NOTICE '✅ Circuit breaker fix deployed successfully!';
  RAISE NOTICE '   - Circuit breaker now tracks per signal_id + user_id + notification_type';
  RAISE NOTICE '   - This allows different notification types to be sent independently';
  RAISE NOTICE '   - signal_created, tp_hit, stop_loss_hit, etc. are now tracked separately';
END $$;

