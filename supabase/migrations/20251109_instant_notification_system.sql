-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 🚀 INSTANT NOTIFICATION SYSTEM
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Migration: Complete rewrite of notification system
-- Date: 2025-11-09
-- Purpose: Replace complex trigger with instant Realtime + async Edge Functions
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Drop old trigger first
DROP TRIGGER IF EXISTS trade_alert_notification_trigger ON public.trade_alerts;

-- Create new instant notification router function
CREATE OR REPLACE FUNCTION public.instant_notification_router()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  function_url TEXT;
  service_role_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg2OTI1MCwiZXhwIjoyMDY3NDQ1MjUwfQ.0tHLp8yWK_lNP_6yrdNn4BqM3kGlWnKMcDf9fYMa2hU';
  base_url TEXT := 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1';
  
  all_users UUID[];
  push_users UUID[];
  author_profile RECORD;
  notification_type TEXT;
  tp_number INTEGER;
  tp_price NUMERIC;
  pips_text TEXT;
  current_price NUMERIC;
  
  payload JSONB;
BEGIN
  -- Get active users (FAST query with limit)
  SELECT ARRAY_AGG(id) INTO all_users
  FROM public.profiles 
  WHERE account_status = 'active' 
  LIMIT 100;
  
  -- Get push-enabled users
  SELECT ARRAY_AGG(id) INTO push_users
  FROM public.profiles
  WHERE account_status = 'active'
    AND push_subscription_active = true
    AND onesignal_player_id IS NOT NULL
    AND onesignal_subscription_status IN ('subscribed', 'subscribed_dev')
  LIMIT 100;

  -- Get author profile
  SELECT 
    COALESCE(NULLIF(trim(display_name), ''), 'Unknown Trader') as display_name,
    avatar_url,
    user_type::text as user_type
  INTO author_profile
  FROM public.profiles
  WHERE id = NEW.user_id;

  -- ROUTE TO CORRECT EDGE FUNCTION BASED ON EVENT TYPE
  IF TG_OP = 'INSERT' THEN
    -- Signal Created or Pending Limit Created
    function_url := base_url || '/notify-signal-created';
    notification_type := CASE 
      WHEN NEW.trade_type IN ('buy_limit', 'sell_limit') THEN 'pending_limit_created'
      ELSE 'signal_created'
    END;
    
  ELSIF TG_OP = 'UPDATE' THEN
    
    -- TP Hit Detection
    IF OLD.tp_hits IS DISTINCT FROM NEW.tp_hits AND array_length(NEW.tp_hits, 1) > 0 THEN
      function_url := base_url || '/notify-tp-hit';
      notification_type := 'tp_hit';
      tp_number := NEW.tp_hits[array_length(NEW.tp_hits, 1)];
      
      -- Get TP price
      tp_price := CASE tp_number
        WHEN 1 THEN NEW.tp1
        WHEN 2 THEN NEW.tp2
        WHEN 3 THEN NEW.tp3
        WHEN 4 THEN NEW.tp4
        WHEN 5 THEN NEW.tp5
        ELSE NULL
      END;
      
      -- Calculate pips (basic calculation, frontend will refine)
      IF NEW.trade_type IN ('buy', 'buy_limit') THEN
        pips_text := '+' || ROUND((tp_price - NEW.entry_price) * 10, 1)::text || ' PIPS';
      ELSE
        pips_text := '+' || ROUND((NEW.entry_price - tp_price) * 10, 1)::text || ' PIPS';
      END IF;
      
    -- Stop Loss Hit
    ELSIF OLD.close_reason IS DISTINCT FROM NEW.close_reason AND NEW.close_reason = 'stop_loss' THEN
      function_url := base_url || '/notify-stop-loss-hit';
      notification_type := 'stop_loss_hit';
      
      -- Calculate pips for SL
      IF NEW.trade_type IN ('buy', 'buy_limit') THEN
        pips_text := ROUND((NEW.stop_loss - NEW.entry_price) * 10, 1)::text || ' PIPS';
      ELSE
        pips_text := ROUND((NEW.entry_price - NEW.stop_loss) * 10, 1)::text || ' PIPS';
      END IF;
      
    -- Limit Activated
    ELSIF OLD.status = 'pending' AND NEW.status = 'active' THEN
      function_url := base_url || '/notify-limit-activated';
      notification_type := 'limit_activated';
      
    -- Signal Closed (Manual, All TPs, etc)
    ELSIF OLD.close_reason IS DISTINCT FROM NEW.close_reason AND NEW.close_reason IN ('manual', 'all_tps_hit') THEN
      function_url := base_url || '/notify-signal-closed';
      notification_type := NEW.close_reason;
      
    -- Notes Updated
    ELSIF OLD.notes IS DISTINCT FROM NEW.notes AND NEW.notes IS NOT NULL THEN
      function_url := base_url || '/notify-notes-updated';
      notification_type := 'notes_updated';
      
    ELSE
      -- No notification needed
      RETURN NEW;
    END IF;
  ELSE
    -- DELETE operations don't trigger notifications
    RETURN NEW;
  END IF;

  -- Build signal payload
  payload := jsonb_build_object(
    'signal', jsonb_build_object(
      'id', NEW.id,
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
      'tradermade_symbol', NEW.tradermade_symbol,
      'status', NEW.status,
      'tp_hits', NEW.tp_hits,
      'author_name', author_profile.display_name,
      'author_avatar_url', author_profile.avatar_url,
      'author_user_type', author_profile.user_type,
      'created_at', NEW.created_at,
      'updated_at', NEW.updated_at
    ),
    'users', all_users,
    'push_users', push_users,
    'notification_type', notification_type,
    'tp_number', tp_number,
    'triggered_price', COALESCE(current_price, tp_price, NEW.entry_price),
    'pips', pips_text,
    'close_reason', NEW.close_reason
  );

  -- 🚀 CALL EDGE FUNCTION (Fire and forget - don't wait for response)
  PERFORM net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := payload,
    timeout_milliseconds := 5000
  );

  RAISE NOTICE '✅ [Instant Notification] Triggered for signal % (type: %)', 
    NEW.id, notification_type;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING '❌ [Instant Notification] Error: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;

-- Apply new trigger
CREATE TRIGGER instant_notification_trigger
  AFTER INSERT OR UPDATE ON public.trade_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.instant_notification_router();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.instant_notification_router() TO authenticated;
GRANT EXECUTE ON FUNCTION public.instant_notification_router() TO service_role;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Instant Notification System installed successfully!';
  RAISE NOTICE '📡 Trigger: instant_notification_trigger';
  RAISE NOTICE '🎯 Edge Functions: notify-signal-created, notify-tp-hit, notify-stop-loss-hit, notify-limit-activated, notify-signal-closed, notify-notes-updated';
  RAISE NOTICE '🚀 Ready to send instant notifications!';
END $$;


