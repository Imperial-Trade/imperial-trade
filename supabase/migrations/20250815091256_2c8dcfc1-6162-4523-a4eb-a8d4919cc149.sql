-- Enhanced Signal Notification System with Trading Intelligence
-- Add trading context fields to improve notification quality

-- Function to calculate enhanced trading metrics
CREATE OR REPLACE FUNCTION public.calculate_trading_metrics(
  p_entry_price NUMERIC,
  p_stop_loss NUMERIC,
  p_tp1 NUMERIC DEFAULT NULL,
  p_trade_type TEXT DEFAULT 'buy'
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  risk_amount NUMERIC;
  reward_amount NUMERIC;
  risk_reward_ratio NUMERIC;
  position_size_hint TEXT;
  volatility_level TEXT;
BEGIN
  -- Calculate risk/reward ratio
  IF p_entry_price IS NOT NULL AND p_stop_loss IS NOT NULL THEN
    risk_amount := ABS(p_entry_price - p_stop_loss);
    
    IF p_tp1 IS NOT NULL THEN
      reward_amount := ABS(p_tp1 - p_entry_price);
      risk_reward_ratio := CASE 
        WHEN risk_amount > 0 THEN ROUND(reward_amount / risk_amount, 2)
        ELSE 0
      END;
    END IF;
  END IF;
  
  -- Determine position size hint based on risk
  position_size_hint := CASE
    WHEN risk_reward_ratio >= 3 THEN 'Conservative 1-2%'
    WHEN risk_reward_ratio >= 2 THEN 'Standard 1-2%'
    WHEN risk_reward_ratio >= 1.5 THEN 'Careful 0.5-1%'
    ELSE 'High Risk 0.25-0.5%'
  END;
  
  -- Determine volatility level based on risk amount percentage
  volatility_level := CASE
    WHEN risk_amount / p_entry_price > 0.05 THEN 'High'
    WHEN risk_amount / p_entry_price > 0.02 THEN 'Medium'
    ELSE 'Low'
  END;
  
  RETURN jsonb_build_object(
    'risk_reward_ratio', risk_reward_ratio,
    'position_size_hint', position_size_hint,
    'volatility_level', volatility_level,
    'risk_amount', risk_amount,
    'reward_amount', reward_amount
  );
END;
$$;

-- Function to get current market session
CREATE OR REPLACE FUNCTION public.get_market_session()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  current_hour INTEGER;
  session_name TEXT;
BEGIN
  current_hour := EXTRACT(HOUR FROM NOW() AT TIME ZONE 'UTC');
  
  session_name := CASE
    WHEN current_hour >= 0 AND current_hour < 6 THEN 'Sydney Open'
    WHEN current_hour >= 6 AND current_hour < 8 THEN 'Tokyo Open'
    WHEN current_hour >= 8 AND current_hour < 13 THEN 'London Open'
    WHEN current_hour >= 13 AND current_hour < 17 THEN 'NY Open'
    WHEN current_hour >= 17 AND current_hour < 22 THEN 'NY Close'
    ELSE 'Market Close'
  END;
  
  RETURN session_name;
END;
$$;

-- Function to get trader performance stats
CREATE OR REPLACE FUNCTION public.get_trader_stats(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  total_signals INTEGER;
  successful_signals INTEGER;
  win_rate NUMERIC;
  trader_level TEXT;
  avg_rr NUMERIC;
BEGIN
  -- Count total signals by this trader
  SELECT COUNT(*) INTO total_signals
  FROM public.trade_alerts
  WHERE user_id = p_user_id
  AND status = 'closed'
  AND created_at > NOW() - INTERVAL '90 days';
  
  -- Count successful signals (those that hit TP before SL)
  SELECT COUNT(*) INTO successful_signals
  FROM public.trade_alerts
  WHERE user_id = p_user_id
  AND status = 'closed'
  AND close_reason LIKE 'tp%'
  AND created_at > NOW() - INTERVAL '90 days';
  
  -- Calculate win rate
  IF total_signals > 0 THEN
    win_rate := ROUND((successful_signals::NUMERIC / total_signals::NUMERIC) * 100, 1);
  ELSE
    win_rate := 0;
  END IF;
  
  -- Determine trader level from profile
  SELECT 
    COALESCE(trader_level, 'Apprentice')
  INTO trader_level
  FROM public.profiles
  WHERE id = p_user_id;
  
  -- Calculate average risk/reward
  SELECT AVG(
    CASE 
      WHEN entry_price > 0 AND stop_loss > 0 AND tp1 > 0 THEN
        ABS(tp1 - entry_price) / ABS(entry_price - stop_loss)
      ELSE NULL
    END
  ) INTO avg_rr
  FROM public.trade_alerts
  WHERE user_id = p_user_id
  AND status = 'closed'
  AND created_at > NOW() - INTERVAL '90 days';
  
  RETURN jsonb_build_object(
    'total_signals', total_signals,
    'successful_signals', successful_signals,
    'win_rate', win_rate,
    'trader_level', trader_level,
    'avg_risk_reward', ROUND(COALESCE(avg_rr, 0), 2)
  );
END;
$$;

-- Enhanced auto_notify_signal_creation function with trading intelligence
CREATE OR REPLACE FUNCTION public.auto_notify_signal_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  author_profile RECORD;
  trader_stats JSONB;
  trading_metrics JSONB;
  market_session TEXT;
  notification_payload JSONB;
  request_id BIGINT;
  service_role_key TEXT;
  function_url TEXT;
BEGIN
  -- Only trigger for signals created by admins or educators
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = NEW.user_id 
    AND (access_level = ANY(ARRAY['admin'::access_level_enum, 'moderator'::access_level_enum]) 
         OR user_type = 'educator'::user_type_enum)
  ) THEN
    
    -- Get service configuration
    service_role_key := current_setting('app.settings.service_role_key', true);
    IF service_role_key IS NULL OR service_role_key = '' THEN
      service_role_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg2OTI1MCwiZXhwIjoyMDY3NDQ1MjUwfQ.0tHLp8yWK_lNP_6yrdNn4BqM3kGlWnKMcDf9fYMa2hU';
    END IF;
    
    function_url := 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/signal-notification-dispatcher';
    
    -- Fetch enhanced author information and stats
    SELECT display_name, avatar_url, trader_level, community_tier
    INTO author_profile
    FROM public.public_profiles 
    WHERE id = NEW.user_id;
    
    -- Get trader performance stats
    trader_stats := public.get_trader_stats(NEW.user_id);
    
    -- Calculate trading metrics
    trading_metrics := public.calculate_trading_metrics(
      NEW.entry_price,
      NEW.stop_loss,
      NEW.tp1,
      NEW.trade_type
    );
    
    -- Get current market session
    market_session := public.get_market_session();
    
    -- Build enhanced notification payload with trading intelligence
    notification_payload := jsonb_build_object(
      'notifications', jsonb_build_array(
        jsonb_build_object(
          'signal_id', NEW.id,
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
          'symbol', NEW.tradermade_symbol,
          'tradermade_symbol', NEW.tradermade_symbol,
          'created_at', NEW.created_at,
          'notification_type', 'signal_created',
          'alert_type', 'signal_created',
          'target_price', NEW.entry_price,
          'triggered_price', NEW.entry_price,
          'status', NEW.status,
          -- Enhanced author information
          'author_id', NEW.user_id,
          'author_name', COALESCE(author_profile.display_name, 'Unknown'),
          'author_avatar_url', author_profile.avatar_url,
          'trader_level', COALESCE(trader_stats->>'trader_level', 'Trader'),
          'win_rate', (trader_stats->>'win_rate')::NUMERIC,
          -- Trading intelligence
          'risk_reward_ratio', (trading_metrics->>'risk_reward_ratio')::NUMERIC,
          'market_session', market_session,
          'volatility_level', trading_metrics->>'volatility_level',
          'position_size_hint', trading_metrics->>'position_size_hint',
          'time_sensitivity', CASE 
            WHEN NEW.trade_type LIKE '%limit%' THEN 'Pending Entry'
            ELSE 'Immediate'
          END,
          'delivery_channels', ARRAY['push', 'in_app'],
          'include_creator', true
        )
      )
    );
    
    -- Send enhanced notification
    BEGIN
      SELECT net.http_post(
        url := function_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_role_key,
          'User-Agent', 'Supabase-Enhanced-Trigger/1.0'
        ),
        body := notification_payload,
        timeout_milliseconds := 10000
      ) INTO request_id;
      
      INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
      VALUES (
        'enhanced_auto_notify_signal_creation', 
        NOW(), 
        1, 
        'success',
        'Enhanced trading notification sent - Request ID: ' || COALESCE(request_id::text, 'null') || 
        ' - Signal: ' || NEW.asset_name || ' - R:R: ' || COALESCE((trading_metrics->>'risk_reward_ratio')::TEXT, 'N/A') ||
        ' - Session: ' || market_session
      );
      
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
      VALUES (
        'enhanced_auto_notify_signal_creation', 
        NOW(), 
        0, 
        'error', 
        'Enhanced notification failed: ' || SQLERRM || ' - Signal ID: ' || NEW.id::text
      );
    END;
    
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
  VALUES (
    'enhanced_auto_notify_signal_creation', 
    NOW(), 
    0, 
    'error', 
    'Enhanced trigger exception: ' || SQLERRM || ' - Signal ID: ' || NEW.id::text
  );
  
  RETURN NEW;
END;
$$;