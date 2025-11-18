-- Migration: Fix instant_notification_router trigger for Pusher Beams
-- This removes all references to OneSignal (onesignal_player_id, onesignal_subscription_status)
-- and updates the trigger to work with Pusher Beams (using push_subscription_active only)

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
BEGIN
  RAISE WARNING '🔥 [TRIGGER FIRED] Signal: %, Op: %, User: %, Type: %, Status: % → %', 
    NEW.id, TG_OP, NEW.user_id, NEW.trade_type, 
    COALESCE(OLD.status::text, 'N/A'), NEW.status::text;

  IF COALESCE(current_setting('app.is_system_operation', true), 'false') = 'true' THEN
    RAISE WARNING '⏭️ [SKIP] System operation detected for signal %', NEW.id;
    RETURN NEW;
  END IF;

  -- ✅ FIX: Get all active users (removed onesignal_player_id reference)
  SELECT COALESCE(jsonb_agg(jsonb_build_object('user_id', id)), '[]'::jsonb)
  INTO v_active_users
  FROM public.profiles
  WHERE account_status = 'active'
    AND user_type IN ('user', 'educator', 'admin');

  RAISE WARNING '👥 [USERS] Found % active users', jsonb_array_length(v_active_users);

  -- ✅ FIX: Get push-enabled users for Pusher Beams (removed onesignal_player_id and onesignal_subscription_status)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'user_id', id,
    'display_name', COALESCE(NULLIF(trim(display_name), ''), NULLIF(trim(real_name), ''), 'User')
  )), '[]'::jsonb)
  INTO v_push_users
  FROM public.profiles
  WHERE account_status = 'active'
    AND push_subscription_active = true;

  RAISE WARNING '📱 [PUSH] Found % push-enabled users', jsonb_array_length(v_push_users);

  SELECT 
    COALESCE(NULLIF(trim(p.display_name), ''), NULLIF(trim(p.real_name), ''), 'Unknown Trader'),
    p.avatar_url,
    COALESCE(p.user_type::text, 'user')
  INTO v_author_name, v_author_avatar, v_author_type
  FROM public.profiles p
  WHERE p.id = NEW.user_id;

  IF v_author_name IS NULL THEN
    v_author_name := 'Unknown Trader';
    v_author_avatar := NULL;
    v_author_type := 'user';
  END IF;

  RAISE WARNING '👤 [AUTHOR] Name: %, Type: %', v_author_name, v_author_type;

  v_pip_size := CASE
    WHEN NEW.tradermade_symbol ~ '^(USD|EUR|GBP|AUD|NZD|CAD|CHF)(JPY)$' THEN 0.01
    WHEN NEW.tradermade_symbol IN ('XAUUSD', 'XAGUSD', 'GOLD', 'SILVER') THEN 0.1
    WHEN NEW.tradermade_symbol ~ '^(US30|NAS100|SPX500|DJI|FTSE|DAX)' THEN 1.0
    ELSE 0.0001
  END;

  IF TG_OP = 'INSERT' THEN
    v_edge_function_url := 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/notify-signal-created';
    v_notification_type := CASE 
      WHEN NEW.trade_type IN ('buy_limit', 'sell_limit') THEN 'pending_limit_created'
      ELSE 'signal_created'
    END;
    
    RAISE WARNING '📤 [INSERT] Routing to notify-signal-created, Type: %', v_notification_type;
    v_payload := jsonb_build_object(
      'signal', jsonb_build_object(
        'id', NEW.id,
        'asset_name', NEW.asset_name,
        'trade_type', NEW.trade_type,
        'entry_price', NEW.entry_price,
        'stop_loss', NEW.stop_loss,
        'tp1', NEW.tp1,
        'tp2', NEW.tp2,
        'tp3', NEW.tp3,
        'tp4', NEW.tp4,
        'tp5', NEW.tp5,
        'author_name', v_author_name,
        'author_avatar_url', v_author_avatar,
        'author_user_type', v_author_type,
        'provider_avatar_url', v_author_avatar,
        'provider_type', v_author_type,
        'notes', NEW.notes,
        'created_at', NEW.created_at
      ),
      'users', v_active_users,
      'push_users', v_push_users
    );

  ELSIF TG_OP = 'UPDATE' AND NEW.tp_hits IS DISTINCT FROM OLD.tp_hits THEN
    v_old_tp_hits := COALESCE(OLD.tp_hits, ARRAY[]::INTEGER[]);
    v_new_tp_hits := COALESCE(NEW.tp_hits, ARRAY[]::INTEGER[]);
    
    WITH new_tps AS (
      SELECT unnest(v_new_tp_hits) AS tp_num
    )
    SELECT tp_num INTO v_tp_number
    FROM new_tps
    WHERE NOT (tp_num = ANY(v_old_tp_hits))
    ORDER BY tp_num DESC
    LIMIT 1;

    IF v_tp_number IS NOT NULL THEN
      v_edge_function_url := 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/notify-tp-hit';
      v_notification_type := 'tp_hit';
      
      v_pips := CASE
        WHEN NEW.trade_type IN ('buy', 'buy_limit') THEN
          CASE v_tp_number
            WHEN 1 THEN (NEW.tp1 - NEW.entry_price) / v_pip_size
            WHEN 2 THEN (NEW.tp2 - NEW.entry_price) / v_pip_size
            WHEN 3 THEN (NEW.tp3 - NEW.entry_price) / v_pip_size
            WHEN 4 THEN (NEW.tp4 - NEW.entry_price) / v_pip_size
            WHEN 5 THEN (NEW.tp5 - NEW.entry_price) / v_pip_size
          END
        ELSE
          CASE v_tp_number
            WHEN 1 THEN (NEW.entry_price - NEW.tp1) / v_pip_size
            WHEN 2 THEN (NEW.entry_price - NEW.tp2) / v_pip_size
            WHEN 3 THEN (NEW.entry_price - NEW.tp3) / v_pip_size
            WHEN 4 THEN (NEW.entry_price - NEW.tp4) / v_pip_size
            WHEN 5 THEN (NEW.entry_price - NEW.tp5) / v_pip_size
          END
      END;

      RAISE WARNING '🎯 [TP HIT] Signal: %, TP%: hit, PIPS: %', NEW.id, v_tp_number, v_pips;

      v_payload := jsonb_build_object(
        'signal', jsonb_build_object(
          'id', NEW.id,
          'asset_name', NEW.asset_name,
          'trade_type', NEW.trade_type,
          'entry_price', NEW.entry_price,
          'tp_number', v_tp_number,
          'tp_price', CASE v_tp_number
            WHEN 1 THEN NEW.tp1
            WHEN 2 THEN NEW.tp2
            WHEN 3 THEN NEW.tp3
            WHEN 4 THEN NEW.tp4
            WHEN 5 THEN NEW.tp5
          END,
          'pips', v_pips,
          'tp_hits', NEW.tp_hits,
          'author_name', v_author_name,
          'author_avatar_url', v_author_avatar,
          'author_user_type', v_author_type,
          'provider_avatar_url', v_author_avatar,
          'provider_type', v_author_type,
          'notes', NEW.notes
        ),
        'users', v_active_users,
        'push_users', v_push_users
      );
    END IF;

  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'closed' AND NEW.close_reason = 'stop_loss' AND OLD.status::text != 'closed' THEN
    v_edge_function_url := 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/notify-stop-loss-hit';
    v_notification_type := 'stop_loss_hit';
    
    v_pips := CASE
      WHEN NEW.trade_type IN ('buy', 'buy_limit') THEN
        (NEW.stop_loss - NEW.entry_price) / v_pip_size
      ELSE
        (NEW.entry_price - NEW.stop_loss) / v_pip_size
    END;

    RAISE WARNING '🛑 [SL HIT] Signal: %, PIPS: %', NEW.id, v_pips;

    v_payload := jsonb_build_object(
      'signal', jsonb_build_object(
        'id', NEW.id,
        'asset_name', NEW.asset_name,
        'trade_type', NEW.trade_type,
        'entry_price', NEW.entry_price,
        'stop_loss', NEW.stop_loss,
        'pips', v_pips,
        'author_name', v_author_name,
        'author_avatar_url', v_author_avatar,
        'author_user_type', v_author_type,
        'provider_avatar_url', v_author_avatar,
        'provider_type', v_author_type,
        'notes', NEW.notes
      ),
      'users', v_active_users,
      'push_users', v_push_users
    );

  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'closed' AND OLD.status::text != 'closed' AND COALESCE(NEW.close_reason::text, '') != 'stop_loss' THEN
    v_edge_function_url := 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/notify-signal-closed';
    v_notification_type := 'signal_closed';
    
    v_close_reason := COALESCE(NULLIF(NEW.close_reason::text, ''), 'manual');

    v_pips := 0;
    IF NEW.tp_hits IS NOT NULL AND array_length(NEW.tp_hits, 1) > 0 THEN
      v_tp_number := NEW.tp_hits[array_length(NEW.tp_hits, 1)];
      
      v_pips := CASE
        WHEN NEW.trade_type IN ('buy', 'buy_limit') THEN
          CASE v_tp_number
            WHEN 1 THEN (NEW.tp1 - NEW.entry_price) / v_pip_size
            WHEN 2 THEN (NEW.tp2 - NEW.entry_price) / v_pip_size
            WHEN 3 THEN (NEW.tp3 - NEW.entry_price) / v_pip_size
            WHEN 4 THEN (NEW.tp4 - NEW.entry_price) / v_pip_size
            WHEN 5 THEN (NEW.tp5 - NEW.entry_price) / v_pip_size
            ELSE 0
          END
        ELSE
          CASE v_tp_number
            WHEN 1 THEN (NEW.entry_price - NEW.tp1) / v_pip_size
            WHEN 2 THEN (NEW.entry_price - NEW.tp2) / v_pip_size
            WHEN 3 THEN (NEW.entry_price - NEW.tp3) / v_pip_size
            WHEN 4 THEN (NEW.entry_price - NEW.tp4) / v_pip_size
            WHEN 5 THEN (NEW.entry_price - NEW.tp5) / v_pip_size
            ELSE 0
          END
      END;
      
      RAISE WARNING '💰 [MANUAL CLOSE WITH TP] Signal: %, Last TP: %, PIPS: %', NEW.id, v_tp_number, v_pips;
    ELSE
      RAISE WARNING '🔒 [MANUAL CLOSE NO TP] Signal: %, PIPS: 0', NEW.id;
    END IF;

    v_payload := jsonb_build_object(
      'signal', jsonb_build_object(
        'id', NEW.id,
        'asset_name', NEW.asset_name,
        'trade_type', NEW.trade_type,
        'entry_price', NEW.entry_price,
        'close_reason', v_close_reason,
        'tp_hits', NEW.tp_hits,
        'tp_number', v_tp_number,
        'author_name', v_author_name,
        'author_avatar_url', v_author_avatar,
        'author_user_type', v_author_type,
        'provider_avatar_url', v_author_avatar,
        'provider_type', v_author_type,
        'notes', NEW.notes
      ),
      'close_reason', v_close_reason,
      'pips', v_pips,
      'users', v_active_users,
      'push_users', v_push_users
    );

  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'active' THEN
    v_edge_function_url := 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/notify-limit-activated';
    v_notification_type := 'limit_activated';

    RAISE WARNING '✅ [LIMIT ACTIVATED] Signal: %', NEW.id;

    v_payload := jsonb_build_object(
      'signal', jsonb_build_object(
        'id', NEW.id,
        'asset_name', NEW.asset_name,
        'trade_type', NEW.trade_type,
        'entry_price', NEW.entry_price,
        'author_name', v_author_name,
        'author_avatar_url', v_author_avatar,
        'author_user_type', v_author_type,
        'provider_avatar_url', v_author_avatar,
        'provider_type', v_author_type,
        'notes', NEW.notes
      ),
      'users', v_active_users,
      'push_users', v_push_users
    );

  ELSIF TG_OP = 'UPDATE' AND NEW.notes IS DISTINCT FROM OLD.notes AND NEW.notes IS NOT NULL THEN
    v_edge_function_url := 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/notify-notes-updated';
    v_notification_type := 'notes_updated';

    RAISE WARNING '📝 [NOTES UPDATED] Signal: %', NEW.id;

    v_payload := jsonb_build_object(
      'signal', jsonb_build_object(
        'id', NEW.id,
        'asset_name', NEW.asset_name,
        'notes', NEW.notes,
        'author_name', v_author_name,
        'author_avatar_url', v_author_avatar,
        'author_user_type', v_author_type,
        'provider_avatar_url', v_author_avatar,
        'provider_type', v_author_type
      ),
      'users', v_active_users,
      'push_users', v_push_users
    );

  ELSE
    RAISE WARNING '⏭️ [SKIP] No notification needed for this operation';
    RETURN NEW;
  END IF;

  IF v_edge_function_url IS NOT NULL AND v_payload IS NOT NULL THEN
    BEGIN
      RAISE WARNING '📡 [HTTP] Calling: %, Payload size: % bytes', 
        v_edge_function_url, length(v_payload::text);

      v_request_id := net.http_post(
        url := v_edge_function_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg2OTI1MCwiZXhwIjoyMDY3NDQ1MjUwfQ.HsNdkHhcXPWuqf1M-W_u9jWI5CJPxJqWkgq3PtK4tTs'
        ),
        body := v_payload
      );

      RAISE WARNING '✅ [SUCCESS] HTTP request queued (ID: %): Notification sent for signal %', v_request_id, NEW.id;
      
      INSERT INTO public.notification_audit_trail (
        signal_id, user_id, notification_type, delivery_channel, status, metadata
      ) VALUES (
        NEW.id, NEW.user_id, v_notification_type, 'trigger', 'sent',
        jsonb_build_object('request_id', v_request_id, 'edge_function', v_edge_function_url)
      );

    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '❌ [EXCEPTION] HTTP request failed: %, Signal: %', SQLERRM, NEW.id;
      
      INSERT INTO public.notification_audit_trail (
        signal_id, user_id, notification_type, delivery_channel, status, metadata
      ) VALUES (
        NEW.id, NEW.user_id, v_notification_type, 'trigger', 'failed',
        jsonb_build_object('error', SQLERRM)
      );
    END;
  END IF;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '❌ [TRIGGER ERROR] Signal: %, Error: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$function$;

