-- ============================================
-- NOTIFICATION TYPE FIX: All 8 Notification Types
-- ============================================
-- Fixes notification_type mapping in enhanced_notification_pipeline_v2()
-- Keeps Edge Function HTTP POST approach (DO NOT change to pg_notify)
-- 
-- DEPLOYMENT: Copy this file to supabase/migrations/ folder with timestamp:
-- Example: supabase/migrations/20251029000000_fix_notification_types.sql
-- Then run: supabase db push
-- 
-- FIXES:
-- 1. Missing pending_limit_created detection (BUY LIMIT/SELL LIMIT)
-- 2. Wrong name limit_order_activated → limit_activated
-- 3. Missing stop_loss_hit detection (was showing as signal_closed)
-- 4. Missing all_tps_hit detection (was showing as signal_closed)
-- 5. Missing notes_updated detection
-- 6. Wrong CASE order (generic signal_closed caught everything first)
-- 7. Missing market price lookup for triggered_price
-- 8. Missing pips calculation with +/- prefix
-- 9. Missing author user_type for role badges
-- 10. Missing tp_number extraction
-- ============================================

DROP FUNCTION IF EXISTS public.enhanced_notification_pipeline_v2() CASCADE;

CREATE OR REPLACE FUNCTION public.enhanced_notification_pipeline_v2()
RETURNS TRIGGER AS $$
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
  
  -- Pips calculation
  pip_size NUMERIC;
  calculated_pips NUMERIC := 0;
  new_tp_count INTEGER := 0;
  
  -- ✅ NEW: Additional variables for enhanced data
  current_market_price NUMERIC;
  pips_value NUMERIC;
  pips_string TEXT;
  tp_number INTEGER;
  total_tps INTEGER;
  author_user_type TEXT;
BEGIN
  -- Configuration
  service_role_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg2OTI1MCwiZXhwIjoyMDY3NDQ1MjUwfQ.0tHLp8yWK_lNP_6yrdNn4BqM3kGlWnKMcDf9fYMa2hU';
  function_url := 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/enhanced-signal-notification-dispatcher';

  -- Validate and sanitize asset_name
  safe_asset_name := COALESCE(NULLIF(trim(NEW.asset_name), ''), 'Unknown Asset');

  -- ============================================
  -- ✅ FIX #1: Enhanced INSERT detection
  -- Distinguish between regular signals and pending limits
  -- ============================================
  IF TG_OP = 'INSERT' THEN
    -- Check if it's a pending limit order
    IF NEW.trade_type IN ('buy_limit', 'sell_limit') THEN
      change_types := array_append(change_types, 'pending_limit_created');
    ELSE
      change_types := array_append(change_types, 'signal_created');
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
    -- ============================================
    -- Status changes with limit order activation
    -- ============================================
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      change_types := array_append(change_types, 'status_change');
      
      -- ONLY fire limit_order_activated if status changed from pending to active
      IF OLD.status = 'pending' AND NEW.status = 'active' AND 
         (NEW.trade_type = 'buy_limit' OR NEW.trade_type = 'sell_limit') THEN
        change_types := array_append(change_types, 'limit_order_activated');
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

    -- ============================================
    -- ✅ FIX #2: Enhanced TP hits detection
    -- ============================================
    IF OLD.tp_hits IS DISTINCT FROM NEW.tp_hits THEN
      new_tp_count := COALESCE(array_length(NEW.tp_hits, 1), 0) - COALESCE(array_length(OLD.tp_hits, 1), 0);
      
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
          'hit_at', NEW.updated_at
        )
      );
    END IF;

    -- ============================================
    -- ✅ FIX #3: Enhanced close reason detection
    -- Distinguish stop_loss, all_tps_hit, and manual close
    -- ============================================
    IF OLD.close_reason IS DISTINCT FROM NEW.close_reason AND NEW.close_reason IS NOT NULL THEN
      IF NEW.close_reason = 'stop_loss' THEN
        change_types := array_append(change_types, 'stop_loss_hit');
        is_significant_change := true;
        priority_level := 3;  -- Highest priority for stop loss
        should_send_notification := true;
      ELSIF NEW.close_reason = 'all_tps_hit' THEN
        change_types := array_append(change_types, 'all_tps_hit');
        is_significant_change := true;
        priority_level := 2;
        should_send_notification := true;
      ELSIF NEW.close_reason = 'manual' THEN
        change_types := array_append(change_types, 'manual_close');
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

    -- ============================================
    -- ✅ FIX #4: Notes updated detection
    -- ============================================
    IF OLD.notes IS DISTINCT FROM NEW.notes AND NEW.notes IS NOT NULL THEN
      change_types := array_append(change_types, 'notes_updated');
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

    -- Significant price updates (only if change is substantial)
    IF OLD.entry_price IS DISTINCT FROM NEW.entry_price AND 
       ABS(NEW.entry_price - OLD.entry_price) / OLD.entry_price > 0.001 THEN
      change_types := array_append(change_types, 'entry_price_update');
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

    -- Check if system operation
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

  -- ============================================
  -- ✅ FIX #5: Fetch author with user_type for role badges
  -- ============================================
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

  -- ============================================
  -- ✅ FIX #6: Fetch current market price for triggered_price
  -- ============================================
  SELECT mid INTO current_market_price
  FROM public.market_prices 
  WHERE symbol = NEW.tradermade_symbol 
  ORDER BY updated_at DESC 
  LIMIT 1;
  
  -- Fallback to entry_price if market price not available
  current_market_price := COALESCE(current_market_price, NEW.entry_price);

  -- ============================================
  -- ✅ FIX #7: Calculate pip_size
  -- ============================================
  pip_size := CASE 
    WHEN NEW.tradermade_symbol LIKE '%JPY%' THEN 0.01
    WHEN NEW.tradermade_symbol LIKE '%XAU%' OR NEW.tradermade_symbol LIKE '%GOLD%' THEN 0.1
    WHEN NEW.tradermade_symbol LIKE '%BTC%' THEN 1.0
    WHEN NEW.tradermade_symbol LIKE '%US30%' OR NEW.tradermade_symbol LIKE '%US100%' THEN 1.0
    ELSE 0.0001
  END;

  -- ============================================
  -- ✅ FIX #8: Calculate pips with +/- prefix
  -- ============================================
  IF 'tp_hits' = ANY(change_types) OR 'multiple_tps_hit' = ANY(change_types) OR 
     NEW.close_reason IN ('all_tps_hit', 'stop_loss') THEN
    
    -- Calculate pips based on trade type
    IF NEW.trade_type IN ('buy', 'buy_limit') THEN
      pips_value := (current_market_price - NEW.entry_price) / pip_size;
    ELSE
      pips_value := (NEW.entry_price - current_market_price) / pip_size;
    END IF;
    
    -- Round to 1 decimal place
    calculated_pips := ROUND(pips_value, 1);
    
    -- Format with +/- prefix
    IF calculated_pips >= 0 THEN
      pips_string := '+' || calculated_pips::text;
    ELSE
      pips_string := calculated_pips::text;
    END IF;
  END IF;

  -- ============================================
  -- ✅ FIX #9: Extract TP number (which TP was hit)
  -- ============================================
  IF ('tp_hits' = ANY(change_types) OR 'multiple_tps_hit' = ANY(change_types)) AND 
     array_length(NEW.tp_hits, 1) > 0 THEN
    -- Get the last (most recent) TP hit
    tp_number := NEW.tp_hits[array_length(NEW.tp_hits, 1)];
  END IF;

  -- ============================================
  -- ✅ FIX #10: Count total TPs defined
  -- ============================================
  total_tps := (
    CASE WHEN NEW.tp1 IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN NEW.tp2 IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN NEW.tp3 IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN NEW.tp4 IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN NEW.tp5 IS NOT NULL THEN 1 ELSE 0 END
  );

  -- Fetch eligible users (subscribers)
  SELECT ARRAY_AGG(user_id) INTO eligible_users
  FROM public.signal_subscriptions 
  WHERE provider_id = NEW.user_id 
    AND is_active = true;

  -- ============================================
  -- Build notification payload with FIXED notification_type
  -- ============================================
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
        
        -- ============================================
        -- ✅ CRITICAL FIX: Correct notification_type mapping
        -- All 8 notification types with proper order
        -- ============================================
        'notification_type', CASE 
          -- 1. PENDING LIMIT (NEW) - Check before regular signal_created
          WHEN TG_OP = 'INSERT' AND (NEW.trade_type = 'buy_limit' OR NEW.trade_type = 'sell_limit') 
            THEN 'pending_limit_created'
          
          -- 2. REGULAR SIGNAL CREATED
          WHEN TG_OP = 'INSERT' 
            THEN 'signal_created'
          
          -- 3. STOP LOSS HIT (CRITICAL - Before generic 'closed')
          WHEN 'stop_loss_hit' = ANY(change_types) OR (NEW.status = 'closed' AND NEW.close_reason = 'stop_loss')
            THEN 'stop_loss_hit'
          
          -- 4. ALL TPS HIT (Before generic 'closed')
          WHEN 'all_tps_hit' = ANY(change_types) OR (NEW.status = 'closed' AND NEW.close_reason = 'all_tps_hit')
            THEN 'all_tps_hit'
          
          -- 5. MANUAL CLOSE (Before generic 'closed')
          WHEN 'manual_close' = ANY(change_types) OR (NEW.status = 'closed' AND NEW.close_reason = 'manual')
            THEN 'manual_close'
          
          -- 6. LIMIT ACTIVATED (Fixed name from limit_order_activated)
          WHEN 'limit_order_activated' = ANY(change_types) 
            THEN 'limit_activated'
          
          -- 7. TP HITS
          WHEN 'multiple_tps_hit' = ANY(change_types) 
            THEN 'tp_hit'
          WHEN 'tp_hits' = ANY(change_types) 
            THEN 'tp_hit'
          
          -- 8. NOTES UPDATED (NEW)
          WHEN 'notes_updated' = ANY(change_types) 
            THEN 'notes_updated'
          
          -- 9. GENERIC CLOSED (Fallback - now at end so specific checks happen first)
          WHEN NEW.status = 'closed' 
            THEN 'signal_closed'
          
          -- 10. DEFAULT
          ELSE 'signal_updated'
        END,
        
        'alert_type', CASE 
          WHEN TG_OP = 'INSERT' THEN 'signal_created'
          ELSE 'signal_updated'
        END,
        'target_price', NEW.entry_price,
        
        -- ✅ NEW: Enhanced data fields
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
        
        -- ✅ ENHANCED: Author with user_type
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
          'bugs_fixed', ARRAY['notification_types', 'pending_limits', 'stop_loss', 'all_tps', 'notes_updated', 'case_order'],
          'features_added', ARRAY['pips_calculation', 'market_price_lookup', 'tp_number', 'author_user_type'],
          'safe_asset_name', safe_asset_name,
          'safe_author_name', author_profile.display_name
        )
      )
    )
  );

  -- ============================================
  -- Send to Edge Function (KEEP HTTP POST - DO NOT CHANGE)
  -- ============================================
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
      INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
      VALUES ('notification_pipeline_v2', NOW(), 0, 'error', 
        format('Failed to send notification for signal %s - no request_id', NEW.id));
    END IF;

  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
    VALUES ('notification_pipeline_v2', NOW(), 0, 'error', 
      format('Notification dispatch error for signal %s: %s', NEW.id, SQLERRM));
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS trade_alert_notification_trigger ON public.trade_alerts;

CREATE TRIGGER trade_alert_notification_trigger
  AFTER INSERT OR UPDATE ON public.trade_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.enhanced_notification_pipeline_v2();

-- ============================================
-- VERIFICATION QUERY
-- ============================================
-- Run this to verify the function was updated:
-- SELECT proname, prosrc FROM pg_proc WHERE proname = 'enhanced_notification_pipeline_v2';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$ 
BEGIN
  RAISE NOTICE '✅ Notification type fix deployed successfully!';
  RAISE NOTICE '📊 All 8 notification types now working:';
  RAISE NOTICE '  1. signal_created (BUY/SELL) - Blue';
  RAISE NOTICE '  2. pending_limit_created (BUY LIMIT/SELL LIMIT) - Yellow';
  RAISE NOTICE '  3. limit_activated - Blue';
  RAISE NOTICE '  4. tp_hit - Green';
  RAISE NOTICE '  5. all_tps_hit - Green';
  RAISE NOTICE '  6. stop_loss_hit - RED';
  RAISE NOTICE '  7. manual_close - Grey';
  RAISE NOTICE '  8. notes_updated - Yellow';
END $$;
