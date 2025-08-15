-- Fix search path security warnings for new functions
-- Add SET search_path TO 'public' to all new functions

CREATE OR REPLACE FUNCTION public.calculate_trading_metrics(
  p_entry_price NUMERIC,
  p_stop_loss NUMERIC,
  p_tp1 NUMERIC DEFAULT NULL,
  p_trade_type TEXT DEFAULT 'buy'
) RETURNS JSONB
LANGUAGE plpgsql
SET search_path TO 'public'
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

CREATE OR REPLACE FUNCTION public.get_market_session()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path TO 'public'
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

CREATE OR REPLACE FUNCTION public.get_trader_stats(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path TO 'public'
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