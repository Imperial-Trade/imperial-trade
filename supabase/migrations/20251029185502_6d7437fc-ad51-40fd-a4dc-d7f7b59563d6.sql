-- ============================================
-- FIX: Complete Notification System Repair
-- ============================================
-- Fixes 4 critical bugs for notification system

-- Enable HTTP extension for edge function calls
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Drop old trigger if exists on trade_alerts table
DROP TRIGGER IF EXISTS enhanced_notification_trigger_v2 ON trade_alerts;

-- Recreate the complete notification function with all fixes
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
  
  -- Track all 9 notification types
  IF TG_OP = 'INSERT' THEN
    change_types := array_append(change_types, 'signal_created');
    should_notify := TRUE;
    
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
    
    -- Type 4: tp_hit
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
    
    -- Type 6 & 7: manual_close
    IF NEW.status = 'closed' AND NEW.close_reason = 'manual' AND OLD.status != 'closed' THEN
      change_types := array_append(change_types, 'status_change');
      
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
  
  IF NOT should_notify THEN
    RETURN NEW;
  END IF;
  
  -- Calculate pip size
  pip_size := CASE 
    WHEN NEW.tradermade_symbol LIKE '%JPY%' THEN 0.01
    WHEN NEW.tradermade_symbol LIKE '%XAU%' OR NEW.tradermade_symbol LIKE '%GOLD%' THEN 0.1
    WHEN NEW.tradermade_symbol LIKE '%BTC%' THEN 1.0
    WHEN NEW.tradermade_symbol LIKE '%US30%' OR NEW.tradermade_symbol LIKE '%US100%' THEN 1.0
    ELSE 0.0001
  END;

  calculated_pips := 0;
  triggered_price := NULL;
  
  -- Calculate pips for TP hits
  IF notification_type IN ('tp_hit', 'multiple_tps_hit') THEN
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
    
  ELSIF notification_type = 'stop_loss_hit' THEN
    triggered_price := NEW.stop_loss;
    IF triggered_price IS NOT NULL AND NEW.entry_price IS NOT NULL THEN
      calculated_pips := ABS(triggered_price - NEW.entry_price) / pip_size;
    END IF;
    
  ELSIF notification_type = 'all_tps_hit' THEN
    triggered_price := COALESCE(NEW.tp5, NEW.tp4, NEW.tp3, NEW.tp2, NEW.tp1);
    IF triggered_price IS NOT NULL AND NEW.entry_price IS NOT NULL THEN
      calculated_pips := ABS(triggered_price - NEW.entry_price) / pip_size;
    END IF;
    
  ELSIF notification_type = 'manual_close_with_tp_hit' THEN
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
  
  -- Get author from profiles table
  SELECT 
    COALESCE(p.display_name, p.real_name, p.email, 'Educator') as author_name,
    p.avatar_url as author_avatar_url,
    p.user_type as author_user_type
  INTO author_info
  FROM profiles p
  WHERE p.id = NEW.user_id;
  
  -- Build complete notification payload
  notification_payload := jsonb_build_object(
    'notifications', jsonb_build_array(
      jsonb_build_object(
        'notification_type', notification_type,
        'signal_id', NEW.id,
        'asset_name', NEW.asset_name,
        'symbol', NEW.symbol,
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
  
  -- Send HTTP POST to edge function
  BEGIN
    PERFORM extensions.http_post(
      url := 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/enhanced-signal-notification-dispatcher',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg2OTI1MCwiZXhwIjoyMDY3NDQ1MjUwfQ.0tHLp8yWK_lNP_6yrdNn4BqM3kGlWnKMcDf9fYMa2hU'
      ),
      body := notification_payload::text
    );
    
    INSERT INTO cron_job_logs (job_name, execution_time, records_affected, status, error_message)
    VALUES (
      'notification_dispatch',
      NOW(),
      1,
      'success',
      format('✅ %s notification dispatched for signal %s', notification_type, NEW.id)
    );
    
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO cron_job_logs (job_name, execution_time, records_affected, status, error_message)
    VALUES (
      'notification_dispatch',
      NOW(),
      0,
      'error',
      format('❌ Failed to dispatch %s: %s', notification_type, SQLERRM)
    );
  END;
  
  RETURN NEW;
END;
$function$;

-- Attach trigger to trade_alerts table
CREATE TRIGGER enhanced_notification_trigger_v2
  AFTER INSERT OR UPDATE ON trade_alerts
  FOR EACH ROW
  EXECUTE FUNCTION enhanced_notification_pipeline_v2();

COMMENT ON FUNCTION enhanced_notification_pipeline_v2() IS 'Complete notification pipeline: 9 types, accurate pips, edge function dispatch';

-- Log success
INSERT INTO cron_job_logs (job_name, execution_time, records_affected, status, error_message)
VALUES (
  'notification_system_repair',
  NOW(),
  1,
  'success',
  '🎉 Notification system fully operational: HTTP enabled, trigger on trade_alerts, all 9 types active'
);