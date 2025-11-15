-- ============================================================================
-- ADD NOTES FIELD TO ALL NOTIFICATION PAYLOADS
-- ============================================================================
-- This migration updates the instant_notification_router() function to include
-- the 'notes' field in ALL notification types, not just notes_updated.
--
-- Issue: Notes were only included in notes_updated notifications
-- Fix: Add 'notes', NEW.notes to all 5 notification payload builds:
--   1. Signal Created (INSERT)
--   2. TP Hit (UPDATE with tp_hits change)
--   3. Stop Loss Hit (UPDATE with close_reason = 'stop_loss')
--   4. Signal Closed (UPDATE with status = 'closed')
--   5. Limit Activated (UPDATE from pending to active)
--
-- Date: 2025-11-15
-- ============================================================================

CREATE OR REPLACE FUNCTION public.instant_notification_router()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_edge_function_url TEXT;
  v_notification_type TEXT;
  v_payload JSONB;
  v_active_users JSONB;
  v_push_users JSONB;
  v_author_name TEXT;
  v_author_avatar TEXT;
  v_author_type TEXT;
  v_request_id BIGINT;
  v_pip_size NUMERIC;
  v_pips NUMERIC;
  v_close_reason TEXT;
  v_tp_number INTEGER;
  v_new_tp_hits INTEGER[];
  v_old_tp_hits INTEGER[];
BEGIN
  -- 🚨 CRITICAL: IMMEDIATE LOGGING TO CONFIRM TRIGGER FIRES
  RAISE WARNING '🔥 [TRIGGER FIRED] Signal: %, Op: %, User: %, Type: %, Status: % → %', 
    NEW.id, TG_OP, NEW.user_id, NEW.trade_type, 
    COALESCE(OLD.status::text, 'N/A'), NEW.status::text;

  -- Skip if system operation (to prevent infinite loops)
  IF COALESCE(current_setting('app.is_system_operation', true), 'false') = 'false' THEN
    RAISE WARNING '⏭️ [SKIP] System operation detected for signal %', NEW.id;
    RETURN NEW;
  END IF;

  -- FETCH ACTIVE USERS FOR NOTIFICATIONS
  SELECT COALESCE(jsonb_agg(jsonb_build_object('user_id', id)), '[]'::jsonb)
  INTO v_active_users
  FROM public.profiles
  WHERE account_status = 'active'
    AND user_type IN ('user', 'educator', 'admin');

  RAISE WARNING '👥 [USERS] Found % active users', jsonb_array_length(v_active_users);

  -- FETCH PUSH-ENABLED USERS
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'user_id', id,
    'player_id', onesignal_player_id,
    'display_name', COALESCE(NULLIF(trim(display_name), ''), NULLIF(trim(real_name), ''), 'User')
  )), '[]'::jsonb)
  INTO v_push_users
  FROM public.profiles
  WHERE account_status = 'active'
    AND push_subscription_active = true
    AND onesignal_player_id IS NOT NULL
    AND onesignal_subscription_status = 'subscribed';

  RAISE WARNING '📱 [PUSH] Found % push-enabled users', jsonb_array_length(v_push_users);

  -- GET AUTHOR PROFILE (NULL-SAFE)
  SELECT 
    COALESCE(NULLIF(trim(p.display_name), ''), NULLIF(trim(p.real_name), ''), 'Unknown Trader'),
    p.avatar_url,
    COALESCE(p.user_type::text, 'user')
  INTO v_author_name, v_author_avatar, v_author_type
  FROM public.profiles p
  WHERE p.id = NEW.user_id;

  -- CALCULATE PIP SIZE
  v_pip_size := CASE
    WHEN NEW.tradermade_symbol ~ '^(USD|EUR|GBP|AUD|NZD|CAD|CHF)(USD|EUR|GBP|AUD|NZD|CAD|CHF)$' THEN 0.0001
    WHEN NEW.tradermade_symbol ~ '^(USD|EUR|GBP|AUD|NZD|CAD|CHF)(JPY)$' THEN 0.01
    WHEN NEW.tradermade_symbol IN ('XAUUSD', 'XAGUSD', 'GOLD', 'SILVER') THEN 0.1
    WHEN NEW.tradermade_symbol ~ '^(US30|NAS100|SPX500|DJI|FTSE|DAX)' THEN 1.0
    WHEN NEW.tradermade_symbol ~ '^(BTC|ETH|XRP|LTC)' THEN 1.0
    ELSE 0.0001
  END;

  -- ============================================
  -- ROUTING LOGIC
  -- ============================================
  
  -- CASE 1: NEW SIGNAL CREATED (INSERT)
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
        'notes', NEW.notes,  -- ✅ ADDED: Include notes in signal created
        'created_at', NEW.created_at
      ),
      'users', v_active_users,
      'push_users', v_push_users
    );

  -- CASE 2: TP HIT (UPDATE with tp_hits change)
  ELSIF TG_OP = 'UPDATE' AND NEW.tp_hits IS DISTINCT FROM OLD.tp_hits THEN
    v_old_tp_hits := COALESCE(OLD.tp_hits, ARRAY[]::INTEGER[]);
    v_new_tp_hits := COALESCE(NEW.tp_hits, ARRAY[]::INTEGER[]);
    
    WITH new_tps AS (
      SELECT unnest(v_new_tp_hits) AS tp_num
    )
    SELECT tp_num INTO v_tp_number
    FROM new_tps
    WHERE tp_num NOT IN (SELECT unnest(v_old_tp_hits))
    ORDER BY tp_num
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
          'notes', NEW.notes  -- ✅ ADDED: Include notes in TP hit
        ),
        'users', v_active_users,
        'push_users', v_push_users
      );
    END IF;

  -- CASE 3: STOP LOSS HIT (UPDATE with close_reason = 'stop_loss')
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
        'notes', NEW.notes  -- ✅ ADDED: Include notes in stop loss
      ),
      'users', v_active_users,
      'push_users', v_push_users
    );

  -- CASE 4: SIGNAL CLOSED (UPDATE with status = 'closed')
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'closed' AND OLD.status::text != 'closed' AND COALESCE(NEW.close_reason, '') != 'stop_loss' THEN
    v_edge_function_url := 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/notify-signal-closed';
    v_notification_type := 'signal_closed';
    v_close_reason := COALESCE(NEW.close_reason, 'manual');

    RAISE WARNING '🔒 [CLOSED] Signal: %, Reason: %', NEW.id, v_close_reason;

    v_payload := jsonb_build_object(
      'signal', jsonb_build_object(
        'id', NEW.id,
        'asset_name', NEW.asset_name,
        'trade_type', NEW.trade_type,
        'entry_price', NEW.entry_price,
        'close_reason', v_close_reason,
        'tp_hits', NEW.tp_hits,
        'author_name', v_author_name,
        'author_avatar_url', v_author_avatar,
        'author_user_type', v_author_type,
        'provider_avatar_url', v_author_avatar,
        'provider_type', v_author_type,
        'notes', NEW.notes  -- ✅ ADDED: Include notes in signal closed
      ),
      'close_reason', v_close_reason,
      'pips', 0,
      'users', v_active_users,
      'push_users', v_push_users
    );

  -- CASE 5: LIMIT ORDER ACTIVATED (UPDATE from pending to active)
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
        'notes', NEW.notes  -- ✅ ADDED: Include notes in limit activated
      ),
      'users', v_active_users,
      'push_users', v_push_users
    );

  -- CASE 6: NOTES UPDATED
  ELSIF TG_OP = 'UPDATE' AND NEW.notes IS DISTINCT FROM OLD.notes AND NEW.notes IS NOT NULL THEN
    v_edge_function_url := 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/notify-notes-updated';
    v_notification_type := 'notes_updated';

    RAISE WARNING '📝 [NOTES UPDATED] Signal: %', NEW.id;

    v_payload := jsonb_build_object(
      'signal', jsonb_build_object(
        'id', NEW.id,
        'asset_name', NEW.asset_name,
        'notes', NEW.notes,  -- ✅ Already present in notes_updated
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
    RAISE WARNING '⏭️ [SKIP] No matching condition for signal % (Op: %, Status: % → %)',
      NEW.id, TG_OP, COALESCE(OLD.status::text, 'N/A'), NEW.status::text;
    RETURN NEW;
  END IF;

  -- ============================================
  -- HTTP POST TO EDGE FUNCTION
  -- ============================================
  RAISE WARNING '🌐 [HTTP] Calling: %', v_edge_function_url;
  RAISE WARNING '📦 [PAYLOAD] %', v_payload::text;

  SELECT request_id INTO v_request_id
  FROM net.http_post(
    url := v_edge_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA3NTY3MjMsImV4cCI6MjA0NjMzMjcyM30.Vxk7fHx3nkxPnZ3g-QRTHzXVJe5WW_mfmv1lVqTgQuk'
    ),
    body := v_payload
  );

  RAISE WARNING '✅ [HTTP] Request ID: %, queued successfully', v_request_id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '❌ [ERROR] Signal: %, Error: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Migration complete: Notes field added to all notification payloads';
  RAISE NOTICE '📝 All 5 notification types now include notes:';
  RAISE NOTICE '   1. Signal Created (INSERT)';
  RAISE NOTICE '   2. TP Hit';
  RAISE NOTICE '   3. Stop Loss Hit';
  RAISE NOTICE '   4. Signal Closed';
  RAISE NOTICE '   5. Limit Activated';
  RAISE NOTICE '🎉 Notes will now appear in Recent Activity for ALL notification types!';
END $$;

