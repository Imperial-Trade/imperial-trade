-- Fix enhanced_notification_pipeline_v2 to use correct field name
-- Bug: Function references NEW.symbol which doesn't exist in trade_alerts table
-- Fix: Use NEW.tradermade_symbol instead

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
  current_market_price NUMERIC;
BEGIN
  -- Fetch author details with user types
  SELECT 
    p.id,
    p.display_name,
    p.real_name,
    p.email,
    array_agg(DISTINCT ur.role) as roles
  INTO author_info
  FROM profiles p
  LEFT JOIN user_roles ur ON ur.user_id = p.id
  WHERE p.id = NEW.user_id
  GROUP BY p.id, p.display_name, p.real_name, p.email;

  -- Get current market price if available
  SELECT mid INTO current_market_price 
  FROM market_prices 
  WHERE symbol = NEW.tradermade_symbol 
  ORDER BY updated_at DESC 
  LIMIT 1;

  -- Calculate pip size
  pip_size := CASE 
    WHEN NEW.tradermade_symbol IN ('XAUUSD', 'XAGUSD') THEN 0.01
    ELSE 0.0001
  END;

  -- Detect notification type
  IF TG_OP = 'INSERT' THEN
    notification_type := 'signal_created';
    should_notify := TRUE;
    priority_level := 'high';
    
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      IF NEW.status = 'active' AND OLD.status = 'pending' THEN
        notification_type := 'limit_order_activated';
        should_notify := TRUE;
        priority_level := 'high';
        triggered_price := NEW.entry_price;
      ELSIF NEW.status = 'closed' THEN
        IF NEW.close_reason = 'stop_loss' THEN
          notification_type := 'stop_loss_hit';
          should_notify := TRUE;
          priority_level := 'critical';
          triggered_price := NEW.stop_loss;
          calculated_pips := ABS(NEW.entry_price - NEW.stop_loss) / pip_size;
        ELSIF NEW.close_reason = 'manual' THEN
          notification_type := 'signal_manually_closed';
          should_notify := TRUE;
          priority_level := 'normal';
        ELSIF NEW.close_reason = 'all_tps_hit' THEN
          notification_type := 'all_tps_hit';
          should_notify := TRUE;
          priority_level := 'high';
        END IF;
      END IF;
    END IF;

    IF array_length(NEW.tp_hits, 1) > array_length(COALESCE(OLD.tp_hits, ARRAY[]::INTEGER[]), 1) THEN
      new_tp_num := NEW.tp_hits[array_length(NEW.tp_hits, 1)];
      notification_type := 'tp_hit';
      should_notify := TRUE;
      priority_level := 'high';
      
      triggered_price := CASE new_tp_num
        WHEN 1 THEN NEW.tp1
        WHEN 2 THEN NEW.tp2
        WHEN 3 THEN NEW.tp3
        WHEN 4 THEN NEW.tp4
        WHEN 5 THEN NEW.tp5
        ELSE NULL
      END;
      
      IF triggered_price IS NOT NULL THEN
        calculated_pips := ABS(NEW.entry_price - triggered_price) / pip_size;
      END IF;
    END IF;

    IF NEW.notes IS DISTINCT FROM OLD.notes AND NEW.notes IS NOT NULL THEN
      notification_type := 'signal_notes_updated';
      should_notify := TRUE;
      priority_level := 'normal';
    END IF;
  END IF;

  IF should_notify THEN
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
          'notes', NEW.notes,
          'created_at', NEW.created_at,
          'updated_at', NEW.updated_at,
          'author_id', author_info.id,
          'author_display_name', COALESCE(author_info.display_name, author_info.real_name, author_info.email),
          'author_roles', author_info.roles,
          'priority_level', priority_level,
          'triggered_price', triggered_price,
          'calculated_pips', calculated_pips,
          'current_market_price', current_market_price,
          'new_tp_number', new_tp_num
        )
      )
    );

    PERFORM net.http_post(
      url := 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/enhanced-signal-notification-dispatcher',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg2OTI1MCwiZXhwIjoyMDY3NDQ1MjUwfQ.0tHLp8yWK_lNP_6yrdNn4BqM3kGlWnKMcDf9fYMa2hU'
      ),
      body := body := notification_payload
    );
  END IF;

  RETURN NEW;
END;
$function$;