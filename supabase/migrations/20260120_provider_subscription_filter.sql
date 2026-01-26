-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 🔔 PROVIDER SUBSCRIPTION FILTER FOR NOTIFICATIONS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- This migration updates the instant_notification_router trigger
-- to respect user's provider subscriptions (signal_subscriptions table)
-- 
-- Before: All push-enabled users received notifications from ALL providers
-- After: Only users who have is_active=true subscription to the signal's
--        provider (author) will receive push notifications
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE OR REPLACE FUNCTION public.instant_notification_router()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_active_users JSONB;
  v_push_users JSONB;
  v_author_name TEXT;
  v_author_avatar TEXT;
  v_author_type TEXT;
  v_edge_function_url TEXT;
  v_notification_type TEXT;
  v_payload JSONB;
  v_request_id BIGINT;
  v_pip_size NUMERIC;
  v_pips NUMERIC;
  v_close_reason TEXT;
  v_tp_number INTEGER;
  v_new_tp_hits INTEGER[];
  v_old_tp_hits INTEGER[];
  v_triggered_price NUMERIC;
  v_total_tps_set INTEGER;
  v_is_all_tps_hit BOOLEAN;
  v_tp_hits_count INTEGER;
BEGIN
  RAISE WARNING '🔥 [TRIGGER] Signal: %, Op: %, Status: % → %', 
    NEW.id, TG_OP, COALESCE(OLD.status::text, 'N/A'), NEW.status::text;

  IF COALESCE(current_setting('app.is_system_operation', true), 'false') = 'true' THEN
    RETURN NEW;
  END IF;

  -- Get active users (for realtime broadcast - all users)
  SELECT COALESCE(jsonb_agg(jsonb_build_object('user_id', id)), '[]'::jsonb)
  INTO v_active_users
  FROM public.profiles
  WHERE account_status = 'active' AND user_type IN ('user', 'educator', 'admin');

  -- ✅ FIXED: Get push-enabled users WHO ARE SUBSCRIBED to this signal's provider
  -- Filters by signal_subscriptions table where provider_id = signal author and is_active = true
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'user_id', p.id,
    'display_name', COALESCE(NULLIF(trim(p.display_name), ''), NULLIF(trim(p.real_name), ''), 'User')
  )), '[]'::jsonb)
  INTO v_push_users
  FROM public.profiles p
  INNER JOIN public.signal_subscriptions ss ON ss.user_id = p.id 
    AND ss.provider_id = NEW.user_id 
    AND ss.is_active = true
  WHERE p.account_status = 'active' 
    AND COALESCE(p.xeon_stream_subscription, false) = true;

  RAISE WARNING '📱 [PUSH] Found % subscribed push-enabled users for provider %', 
    jsonb_array_length(v_push_users), NEW.user_id;

  SELECT 
    COALESCE(NULLIF(trim(p.display_name), ''), NULLIF(trim(p.real_name), ''), 'Unknown Trader'),
    p.avatar_url,
    COALESCE(p.user_type::text, 'user')
  INTO v_author_name, v_author_avatar, v_author_type
  FROM public.profiles p WHERE p.id = NEW.user_id;

  IF v_author_name IS NULL THEN
    v_author_name := 'Unknown Trader';
  END IF;

  -- Pip size calculation
  v_pip_size := CASE
    WHEN NEW.tradermade_symbol ~ '^(USD|EUR|GBP|AUD|NZD|CAD|CHF)(JPY)$' THEN 0.01
    WHEN NEW.tradermade_symbol IN ('XAUUSD', 'XAGUSD', 'GOLD', 'SILVER') THEN 0.1
    WHEN NEW.tradermade_symbol IN ('BTCUSD', 'BTC', 'BTC/USD') OR UPPER(NEW.asset_name) LIKE '%BTC%' THEN 1.0
    WHEN NEW.tradermade_symbol ~ '^(US30|NAS100|SPX500|DJI|FTSE|DAX)' THEN 1.0
    ELSE 0.0001
  END;

  -- Count how many TPs are set (non-null)
  v_total_tps_set := 0;
  IF NEW.tp1 IS NOT NULL THEN v_total_tps_set := v_total_tps_set + 1; END IF;
  IF NEW.tp2 IS NOT NULL THEN v_total_tps_set := v_total_tps_set + 1; END IF;
  IF NEW.tp3 IS NOT NULL THEN v_total_tps_set := v_total_tps_set + 1; END IF;
  IF NEW.tp4 IS NOT NULL THEN v_total_tps_set := v_total_tps_set + 1; END IF;
  IF NEW.tp5 IS NOT NULL THEN v_total_tps_set := v_total_tps_set + 1; END IF;

  IF TG_OP = 'INSERT' THEN
    v_edge_function_url := 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/notify-signal-created';
    v_notification_type := CASE 
      WHEN NEW.trade_type IN ('buy_limit', 'sell_limit') THEN 'pending_limit_created'
      ELSE 'signal_created'
    END;
    
    v_payload := jsonb_build_object(
      'signal', jsonb_build_object(
        'id', NEW.id, 'asset_name', NEW.asset_name, 'trade_type', NEW.trade_type,
        'entry_price', NEW.entry_price, 'stop_loss', NEW.stop_loss,
        'tp1', NEW.tp1, 'tp2', NEW.tp2, 'tp3', NEW.tp3, 'tp4', NEW.tp4, 'tp5', NEW.tp5,
        'author_name', v_author_name, 'author_avatar_url', v_author_avatar,
        'author_user_type', v_author_type, 'notes', NEW.notes
      ),
      'users', v_active_users, 'push_users', v_push_users
    );

  ELSIF TG_OP = 'UPDATE' AND NEW.tp_hits IS DISTINCT FROM OLD.tp_hits THEN
    v_old_tp_hits := COALESCE(OLD.tp_hits, ARRAY[]::INTEGER[]);
    v_new_tp_hits := COALESCE(NEW.tp_hits, ARRAY[]::INTEGER[]);
    v_tp_hits_count := array_length(v_new_tp_hits, 1);
    
    -- Find the newest TP that was hit
    WITH new_tps AS (SELECT unnest(v_new_tp_hits) AS tp_num)
    SELECT tp_num INTO v_tp_number
    FROM new_tps WHERE NOT (tp_num = ANY(v_old_tp_hits))
    ORDER BY tp_num DESC LIMIT 1;

    -- Check if ALL TPs are now hit - must match exactly
    v_is_all_tps_hit := (v_tp_hits_count = v_total_tps_set AND v_total_tps_set > 0);

    RAISE WARNING '📊 [TP DETECTION] Signal: %, Total TPs Set: %, TPs Hit Count: %, New TP: %, Is All Hit: %', 
      NEW.id, v_total_tps_set, v_tp_hits_count, v_tp_number, v_is_all_tps_hit;

    IF v_tp_number IS NOT NULL THEN
      v_triggered_price := CASE v_tp_number
        WHEN 1 THEN NEW.tp1 WHEN 2 THEN NEW.tp2 WHEN 3 THEN NEW.tp3
        WHEN 4 THEN NEW.tp4 WHEN 5 THEN NEW.tp5
      END;
      
      v_pips := CASE
        WHEN NEW.trade_type IN ('buy', 'buy_limit') THEN (v_triggered_price - NEW.entry_price) / v_pip_size
        ELSE (NEW.entry_price - v_triggered_price) / v_pip_size
      END;

      -- If ALL TPs are hit, send to notify-signal-closed with all_tps_hit type
      IF v_is_all_tps_hit THEN
        RAISE WARNING '🎉 [ALL TPs HIT] Signal: %, Routing to notify-signal-closed, TP Count: %', 
          NEW.id, v_total_tps_set;
        
        v_edge_function_url := 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/notify-signal-closed';
        v_notification_type := 'all_tps_hit';
        
        v_payload := jsonb_build_object(
          'signal', jsonb_build_object(
            'id', NEW.id, 'asset_name', NEW.asset_name, 'trade_type', NEW.trade_type,
            'entry_price', NEW.entry_price, 'tp_number', v_tp_number,
            'triggered_price', v_triggered_price, 'pips', v_pips, 'tp_hits', NEW.tp_hits,
            'tp1', NEW.tp1, 'tp2', NEW.tp2, 'tp3', NEW.tp3, 'tp4', NEW.tp4, 'tp5', NEW.tp5,
            'total_tps_set', v_total_tps_set,
            'author_name', v_author_name, 'author_avatar_url', v_author_avatar,
            'author_user_type', v_author_type, 'notes', NEW.notes
          ),
          'notification_type', 'all_tps_hit',
          'close_reason', 'all_tps_hit',
          'pips', v_pips,
          'users', v_active_users, 'push_users', v_push_users
        );
      ELSE
        -- Regular TP hit
        RAISE WARNING '🎯 [REGULAR TP HIT] Signal: %, TP: %, Routing to notify-tp-hit', 
          NEW.id, v_tp_number;
        
        v_edge_function_url := 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/notify-tp-hit';
        v_notification_type := 'tp_hit';

        v_payload := jsonb_build_object(
          'signal', jsonb_build_object(
            'id', NEW.id, 'asset_name', NEW.asset_name, 'trade_type', NEW.trade_type,
            'entry_price', NEW.entry_price, 'tp_number', v_tp_number,
            'triggered_price', v_triggered_price, 'pips', v_pips, 'tp_hits', NEW.tp_hits,
            'tp1', NEW.tp1, 'tp2', NEW.tp2, 'tp3', NEW.tp3, 'tp4', NEW.tp4, 'tp5', NEW.tp5,
            'author_name', v_author_name, 'author_avatar_url', v_author_avatar,
            'author_user_type', v_author_type, 'notes', NEW.notes
          ),
          'users', v_active_users, 'push_users', v_push_users
        );
      END IF;
    END IF;

  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'closed' AND NEW.close_reason = 'stop_loss' AND OLD.status::text != 'closed' THEN
    v_edge_function_url := 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/notify-stop-loss-hit';
    v_notification_type := 'stop_loss_hit';
    
    v_pips := CASE
      WHEN NEW.trade_type IN ('buy', 'buy_limit') THEN (NEW.stop_loss - NEW.entry_price) / v_pip_size
      ELSE (NEW.entry_price - NEW.stop_loss) / v_pip_size
    END;

    v_payload := jsonb_build_object(
      'signal', jsonb_build_object(
        'id', NEW.id, 'asset_name', NEW.asset_name, 'trade_type', NEW.trade_type,
        'entry_price', NEW.entry_price, 'stop_loss', NEW.stop_loss,
        'triggered_price', NEW.stop_loss, 'pips', v_pips,
        'author_name', v_author_name, 'author_avatar_url', v_author_avatar,
        'author_user_type', v_author_type, 'notes', NEW.notes
      ),
      'users', v_active_users, 'push_users', v_push_users
    );

  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'closed' AND OLD.status::text != 'closed' AND COALESCE(NEW.close_reason::text, '') != 'stop_loss' THEN
    v_edge_function_url := 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/notify-signal-closed';
    v_notification_type := 'signal_closed';
    v_close_reason := COALESCE(NULLIF(NEW.close_reason::text, ''), 'manual');

    v_pips := 0;
    IF NEW.tp_hits IS NOT NULL AND array_length(NEW.tp_hits, 1) > 0 THEN
      v_tp_number := NEW.tp_hits[array_length(NEW.tp_hits, 1)];
      v_triggered_price := CASE v_tp_number
        WHEN 1 THEN NEW.tp1 WHEN 2 THEN NEW.tp2 WHEN 3 THEN NEW.tp3
        WHEN 4 THEN NEW.tp4 WHEN 5 THEN NEW.tp5 ELSE NEW.entry_price
      END;
      v_pips := CASE
        WHEN NEW.trade_type IN ('buy', 'buy_limit') THEN (v_triggered_price - NEW.entry_price) / v_pip_size
        ELSE (NEW.entry_price - v_triggered_price) / v_pip_size
      END;
    END IF;

    v_payload := jsonb_build_object(
      'signal', jsonb_build_object(
        'id', NEW.id, 'asset_name', NEW.asset_name, 'trade_type', NEW.trade_type,
        'entry_price', NEW.entry_price, 'close_reason', v_close_reason,
        'closing_price', NEW.closing_price,
        'triggered_price', COALESCE(NEW.closing_price, v_triggered_price, NEW.entry_price),
        'tp_hits', NEW.tp_hits, 'tp_number', v_tp_number, 'pips', v_pips,
        'tp1', NEW.tp1, 'tp2', NEW.tp2, 'tp3', NEW.tp3, 'tp4', NEW.tp4, 'tp5', NEW.tp5,
        'author_name', v_author_name, 'author_avatar_url', v_author_avatar,
        'author_user_type', v_author_type, 'notes', NEW.notes
      ),
      'close_reason', v_close_reason, 'pips', v_pips,
      'notification_type', v_close_reason,
      'users', v_active_users, 'push_users', v_push_users
    );

  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'active' THEN
    v_edge_function_url := 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/notify-limit-activated';
    v_notification_type := 'limit_activated';

    v_payload := jsonb_build_object(
      'signal', jsonb_build_object(
        'id', NEW.id, 'asset_name', NEW.asset_name, 'trade_type', NEW.trade_type,
        'entry_price', NEW.entry_price, 'triggered_price', NEW.activation_price,
        'author_name', v_author_name, 'author_avatar_url', v_author_avatar,
        'author_user_type', v_author_type, 'notes', NEW.notes
      ),
      'users', v_active_users, 'push_users', v_push_users
    );

  ELSIF TG_OP = 'UPDATE' AND NEW.notes IS DISTINCT FROM OLD.notes AND NEW.notes IS NOT NULL THEN
    v_edge_function_url := 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/notify-notes-updated';
    v_notification_type := 'notes_updated';

    v_payload := jsonb_build_object(
      'signal', jsonb_build_object(
        'id', NEW.id, 'asset_name', NEW.asset_name, 'notes', NEW.notes,
        'author_name', v_author_name, 'author_avatar_url', v_author_avatar,
        'author_user_type', v_author_type
      ),
      'users', v_active_users, 'push_users', v_push_users
    );

  ELSE
    RETURN NEW;
  END IF;

  IF v_edge_function_url IS NOT NULL AND v_payload IS NOT NULL THEN
    BEGIN
      v_request_id := net.http_post(
        url := v_edge_function_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg2OTI1MCwiZXhwIjoyMDY3NDQ1MjUwfQ.HsNdkHhcXPWuqf1M-W_u9jWI5CJPxJqWkgq3PtK4tTs'
        ),
        body := v_payload
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '❌ [TRIGGER] HTTP failed: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '❌ [TRIGGER ERROR] %', SQLERRM;
  RETURN NEW;
END;
$function$;

-- Add comment documenting the change
COMMENT ON FUNCTION public.instant_notification_router() IS 
  'Routes trade_alerts changes to notification Edge Functions. 
   As of 2026-01-20: Filters push notifications by signal_subscriptions table - 
   only users who have is_active=true subscription to the signal provider will receive push notifications.
   Realtime broadcast (v_active_users) still goes to all active users for UI updates.';
