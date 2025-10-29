-- ============================================
-- HOTFIX: Fix NEW.symbol column reference
-- BUG: trade_alerts table doesn't have 'symbol' column
-- FIX: Use NEW.tradermade_symbol instead
-- ============================================

-- Drop existing trigger
DROP TRIGGER IF EXISTS enhanced_notification_trigger_v2 ON trade_alerts;

-- Recreate function with FIXED column reference
CREATE OR REPLACE FUNCTION public.enhanced_notification_pipeline_v2()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  change_types TEXT[];
  notification_type TEXT;
  priority_level TEXT := 'normal';
  should_notify BOOLEAN := FALSE;
  notification_payload JSONB;
  pip_size NUMERIC;
  calculated_pips NUMERIC;
  triggered_price NUMERIC;
  new_tp_num INTEGER;
  author_info RECORD;
BEGIN
  -- Initialize change tracking
  change_types := ARRAY[]::TEXT[];
  
  -- ============================================
  -- Track Changes - ONLY 9 TYPES ALLOWED
  -- ============================================
  
  IF TG_OP = 'INSERT' THEN
    change_types := array_append(change_types, 'signal_created');
    should_notify := TRUE;
    
    -- Type 1: signal_created OR Type 2: pending_limit_created
    IF NEW.trade_type IN ('buy_limit', 'sell_limit') AND NEW.status = 'pending' THEN
      notification_type := 'pending_limit_created';
      priority_level := 'normal';
    ELSE
      notification_type := 'signal_created';
      priority_level := 'high';
    END IF;
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    -- Type 3: limit_activated
    IF OLD.status = 'pending' AND NEW.status = 'active' THEN
      change_types := array_append(change_types, 'status_change');
      notification_type := 'limit_activated';
      priority_level := 'high';
      should_notify := TRUE;
    END IF;
    
    -- Type 4: tp_hit (TP1-TP5)
    IF OLD.tp_hits IS DISTINCT FROM NEW.tp_hits THEN
      change_types := array_append(change_types, 'tp_hits');
      should_notify := TRUE;
      
      IF array_length(NEW.tp_hits, 1) - COALESCE(array_length(OLD.tp_hits, 1), 0) > 1 THEN
        notification_type := 'multiple_tps_hit';
      ELSE
        notification_type := 'tp_hit';
      END IF;
      priority_level := 'high';
    END IF;
    
    -- Type 5: stop_loss_hit
    IF NEW.status = 'closed' AND NEW.close_reason = 'stop_loss' AND OLD.status != 'closed' THEN
      change_types := array_append(change_types, 'status_change');
      notification_type := 'stop_loss_hit';
      priority_level := 'critical';
      should_notify := TRUE;
    END IF;
    
    -- Type 6: manual_close OR Type 7: manual_close_with_tp_hit
    IF NEW.status = 'closed' AND NEW.close_reason = 'manual' AND OLD.status != 'closed' THEN
      change_types := array_append(change_types, 'status_change');
      
      -- Check if any TPs were hit before manual close
      IF array_length(NEW.tp_hits, 1) > 0 THEN
        notification_type := 'manual_close_with_tp_hit';
      ELSE
        notification_type := 'manual_close';
      END IF;
      priority_level := 'normal';
      should_notify := TRUE;
    END IF;
    
    -- Type 8: all_tps_hit
    IF NEW.status = 'closed' AND NEW.close_reason = 'all_tps_hit' AND OLD.status != 'closed' THEN
      change_types := array_append(change_types, 'status_change');
      notification_type := 'all_tps_hit';
      priority_level := 'high';
      should_notify := TRUE;
    END IF;
    
    -- Type 9: notes_updated
    IF OLD.notes IS DISTINCT FROM NEW.notes THEN
      change_types := array_append(change_types, 'notes_update');
      notification_type := 'notes_updated';
      priority_level := 'low';
      should_notify := TRUE;
    END IF;
  END IF;
  
  -- If no notification should be sent, return
  IF NOT should_notify THEN
    RETURN NEW;
  END IF;
  
  -- ============================================
  -- ACCURATE PIPS CALCULATION
  -- ============================================
  
  -- Determine pip size based on symbol
  pip_size := CASE 
    WHEN NEW.tradermade_symbol LIKE '%JPY%' THEN 0.01
    WHEN NEW.tradermade_symbol LIKE '%XAU%' OR NEW.tradermade_symbol LIKE '%GOLD%' THEN 0.1
    WHEN NEW.tradermade_symbol LIKE '%BTC%' THEN 1.0
    WHEN NEW.tradermade_symbol LIKE '%US30%' OR NEW.tradermade_symbol LIKE '%US100%' THEN 1.0
    ELSE 0.0001
  END;

  -- Calculate pips and triggered_price based on notification type
  calculated_pips := 0;
  triggered_price := NULL;
  
  -- For TP hits (Type 4)
  IF notification_type IN ('tp_hit', 'multiple_tps_hit') THEN
    -- Get the last TP that was hit
    new_tp_num := NEW.tp_hits[array_length(NEW.tp_hits, 1)];
    triggered_price := CASE new_tp_num
      WHEN 1 THEN NEW.tp1
      WHEN 2 THEN NEW.tp2
      WHEN 3 THEN NEW.tp3
      WHEN 4 THEN NEW.tp4
      WHEN 5 THEN NEW.tp5
    END;
    
    IF triggered_price IS NOT NULL AND NEW.entry_price IS NOT NULL THEN
      calculated_pips := ABS(triggered_price - NEW.entry_price) / pip_size;
    END IF;
    
  -- For stop loss (Type 5)
  ELSIF notification_type = 'stop_loss_hit' THEN
    triggered_price := NEW.stop_loss;
    IF triggered_price IS NOT NULL AND NEW.entry_price IS NOT NULL THEN
      calculated_pips := ABS(triggered_price - NEW.entry_price) / pip_size;
    END IF;
    
  -- For all TPs hit (Type 8)
  ELSIF notification_type = 'all_tps_hit' THEN
    -- Use highest TP available
    triggered_price := COALESCE(NEW.tp5, NEW.tp4, NEW.tp3, NEW.tp2, NEW.tp1);
    IF triggered_price IS NOT NULL AND NEW.entry_price IS NOT NULL THEN
      calculated_pips := ABS(triggered_price - NEW.entry_price) / pip_size;
    END IF;
    
  -- For manual close with TP hit (Type 7)
  ELSIF notification_type = 'manual_close_with_tp_hit' THEN
    -- Get the last TP that was hit
    new_tp_num := NEW.tp_hits[array_length(NEW.tp_hits, 1)];
    triggered_price := CASE new_tp_num
      WHEN 1 THEN NEW.tp1
      WHEN 2 THEN NEW.tp2
      WHEN 3 THEN NEW.tp3
      WHEN 4 THEN NEW.tp4
      WHEN 5 THEN NEW.tp5
    END;
    
    IF triggered_price IS NOT NULL AND NEW.entry_price IS NOT NULL THEN
      calculated_pips := ABS(triggered_price - NEW.entry_price) / pip_size;
    END IF;
  END IF;
  
  -- ============================================
  -- Get Author Information from PROFILES table
  -- ============================================
  SELECT 
    COALESCE(p.display_name, p.full_name, 'Educator') as author_name,
    p.avatar_url as author_avatar_url,
    p.user_type::text as author_user_type
  INTO author_info
  FROM profiles p
  WHERE p.id = NEW.user_id;
  
  -- ============================================
  -- Build Notification Payload - Complete Data
  -- ✅ CRITICAL FIX: Changed NEW.symbol to NEW.tradermade_symbol
  -- ============================================
  notification_payload := jsonb_build_object(
    'notifications', jsonb_build_array(
      jsonb_build_object(
        'notification_type', notification_type,
        'signal_id', NEW.id,
        'asset_name', NEW.asset_name,
        'symbol', NEW.tradermade_symbol,
        'tradermade_symbol', NEW.tradermade_symbol,
        'trade_type', NEW.trade_type,
        'entry_price', NEW.entry_price,
        'stop_loss', NEW.stop_loss,
        'tp1', NEW.tp1,
        'tp2', NEW.tp2,
        'tp3', NEW.tp3,
        'tp4', NEW.tp4,
        'tp5', NEW.tp5,
        'status', NEW.status,
        'close_reason', NEW.close_reason,
        'tp_hits', NEW.tp_hits,
        'change_types', change_types,
        'priority_level', priority_level,
        'author_name', author_info.author_name,
        'author_avatar_url', author_info.author_avatar_url,
        'author_user_type', author_info.author_user_type,
        'triggered_price', triggered_price,
        'pip_calculation', jsonb_build_object(
          'calculated_pips', calculated_pips,
          'pip_size', pip_size,
          'entry_price', NEW.entry_price,
          'triggered_price', triggered_price
        ),
        'created_at', COALESCE(NEW.created_at, NOW()),
        'updated_at', NOW()
      )
    )
  );
  
  -- ============================================
  -- Send to Edge Function
  -- ============================================
  PERFORM net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/enhanced-signal-notification-dispatcher',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := notification_payload
  );
  
  RETURN NEW;
END;
$function$;

-- Recreate trigger
CREATE TRIGGER enhanced_notification_trigger_v2
  AFTER INSERT OR UPDATE ON trade_alerts
  FOR EACH ROW
  EXECUTE FUNCTION enhanced_notification_pipeline_v2();

-- Verification query
SELECT 
  'HOTFIX DEPLOYED ✅' as status,
  'Signal creation should now work!' as message,
  tgname as trigger_name,
  tgrelid::regclass as table_name
FROM pg_trigger
WHERE tgname = 'enhanced_notification_trigger_v2';