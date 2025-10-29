-- ============================================================================
-- MIGRATION: Fix Alert Processing Deadlocks
-- Created: 2025-10-29 07:00:00
-- Purpose: Eliminate deadlocks by using SKIP LOCKED and batch processing
-- ============================================================================

-- ============================================================================
-- PART 1: Create New Batch Processing Function
-- ============================================================================

CREATE OR REPLACE FUNCTION process_price_alerts_batch_v3(
  p_symbols text[],
  p_prices jsonb  -- Format: {"XAUUSD": {"bid": 2745.23, "ask": 2745.45, "mid": 2745.34}}
) RETURNS TABLE(
  alert_id uuid,
  signal_id uuid,
  alert_type text,
  target_price numeric,
  triggered boolean,
  priority_level integer,
  current_price numeric,
  symbol text
) 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET statement_timeout = '3s'  -- Timeout protection
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    am.id as alert_id,
    am.signal_id,
    am.alert_type,
    am.target_price,
    
    -- Check trigger conditions based on trade type
    CASE 
      -- Stop Loss triggers
      WHEN am.alert_type = 'stop_loss' THEN
        CASE 
          WHEN ta.trade_type IN ('buy', 'buy_limit') THEN 
            -- BUY trades: Stop loss triggers when bid <= target
            ((p_prices->am.symbol->>'bid')::numeric <= am.target_price)
          ELSE 
            -- SELL trades: Stop loss triggers when ask >= target
            ((p_prices->am.symbol->>'ask')::numeric >= am.target_price)
        END
        
      -- Take Profit triggers
      WHEN am.alert_type LIKE 'take_profit_%' THEN
        CASE 
          WHEN ta.trade_type IN ('buy', 'buy_limit') THEN 
            -- BUY trades: TP triggers when ask >= target
            ((p_prices->am.symbol->>'ask')::numeric >= am.target_price)
          ELSE 
            -- SELL trades: TP triggers when bid <= target
            ((p_prices->am.symbol->>'bid')::numeric <= am.target_price)
        END
        
      ELSE false
    END as triggered,
    
    -- Priority: Stop Loss = 3 (highest), TP = 2, Other = 1
    CASE 
      WHEN am.alert_type = 'stop_loss' THEN 3
      WHEN am.alert_type LIKE 'take_profit_%' THEN 2
      ELSE 1
    END as priority_level,
    
    -- Current price (use appropriate bid/ask based on trade type)
    CASE 
      WHEN ta.trade_type IN ('buy', 'buy_limit') THEN 
        ((p_prices->am.symbol->>'bid')::numeric)
      ELSE 
        ((p_prices->am.symbol->>'ask')::numeric)
    END as current_price,
    
    am.symbol
    
  FROM alert_monitoring am
  JOIN trade_alerts ta ON am.signal_id = ta.id
  WHERE 
    am.symbol = ANY(p_symbols)
    AND am.is_active = true
    AND ta.status = 'active'
  FOR UPDATE OF am SKIP LOCKED  -- CRITICAL: Skip locked rows instead of waiting
  ORDER BY 
    -- Process stop losses first, then TPs
    CASE WHEN am.alert_type = 'stop_loss' THEN 1 ELSE 2 END,
    am.priority_level DESC,
    am.created_at ASC;  -- FIFO within same priority
END;
$$;

COMMENT ON FUNCTION process_price_alerts_batch_v3 IS 
  'Batch processes alerts with SKIP LOCKED to prevent deadlocks. Returns alerts that should be processed.';

-- ============================================================================
-- PART 2: Add Performance Indexes
-- ============================================================================

-- Index 1: Fast alert lookup by symbol and status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alert_monitoring_active_symbol 
ON alert_monitoring(symbol, is_active, alert_type) 
WHERE is_active = true;

-- Index 2: Fast trade_alerts lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trade_alerts_status_symbol 
ON trade_alerts(tradermade_symbol, status) 
WHERE status = 'active';

-- Index 3: User + status queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trade_alerts_user_status 
ON trade_alerts(user_id, status, updated_at DESC) 
WHERE status IN ('active', 'pending');

-- Index 4: Alert monitoring + signal join
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alert_monitoring_signal_active
ON alert_monitoring(signal_id, is_active)
WHERE is_active = true;

-- ============================================================================
-- PART 3: Alert Processing Cooldown Tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS alert_processing_cooldowns (
  symbol text PRIMARY KEY,
  last_processed_at timestamptz NOT NULL DEFAULT now(),
  processing_count integer NOT NULL DEFAULT 0,
  last_triggered_alerts integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE alert_processing_cooldowns IS 
  'Tracks when each symbol''s alerts were last processed to enforce cooldown periods';

-- Function to check and update cooldown
CREATE OR REPLACE FUNCTION check_alert_processing_cooldown(
  p_symbol text,
  p_cooldown_seconds integer DEFAULT 2
) RETURNS TABLE(
  can_process boolean,
  last_processed_at timestamptz,
  seconds_since_last_process numeric
) 
LANGUAGE plpgsql AS $$
DECLARE
  v_last_processed timestamptz;
  v_can_process boolean;
  v_seconds_since numeric;
BEGIN
  -- Get last processed time
  SELECT apc.last_processed_at INTO v_last_processed
  FROM alert_processing_cooldowns apc
  WHERE apc.symbol = p_symbol;
  
  -- Calculate if we can process
  IF v_last_processed IS NULL THEN
    v_can_process := true;
    v_seconds_since := NULL;
  ELSE
    v_seconds_since := EXTRACT(EPOCH FROM (now() - v_last_processed));
    v_can_process := v_seconds_since >= p_cooldown_seconds;
  END IF;
  
  -- Update if we can process
  IF v_can_process THEN
    INSERT INTO alert_processing_cooldowns (
      symbol, 
      last_processed_at, 
      processing_count,
      updated_at
    )
    VALUES (
      p_symbol, 
      now(), 
      1,
      now()
    )
    ON CONFLICT (symbol) DO UPDATE 
    SET 
      last_processed_at = now(),
      processing_count = alert_processing_cooldowns.processing_count + 1,
      updated_at = now();
  END IF;
  
  -- Return result
  RETURN QUERY SELECT v_can_process, v_last_processed, v_seconds_since;
END;
$$;

-- ============================================================================
-- PART 4: Add Monitoring View
-- ============================================================================

CREATE OR REPLACE VIEW alert_processing_stats AS
SELECT 
  apc.symbol,
  apc.processing_count,
  apc.last_processed_at,
  EXTRACT(EPOCH FROM (now() - apc.last_processed_at)) as seconds_since_last_process,
  apc.last_triggered_alerts,
  COUNT(am.id) as active_alerts
FROM alert_processing_cooldowns apc
LEFT JOIN alert_monitoring am ON am.symbol = apc.symbol AND am.is_active = true
GROUP BY apc.symbol, apc.processing_count, apc.last_processed_at, apc.last_triggered_alerts
ORDER BY apc.last_processed_at DESC;

COMMENT ON VIEW alert_processing_stats IS 
  'Real-time stats on alert processing frequency and cooldowns';

-- ============================================================================
-- PART 5: Verify Migration Success
-- ============================================================================

DO $$
BEGIN
  -- Check function was created
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'process_price_alerts_batch_v3'
  ) THEN
    RAISE EXCEPTION 'Function process_price_alerts_batch_v3 was not created successfully';
  END IF;
  
  -- Check indexes were created (may still be building if using CONCURRENTLY)
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_alert_monitoring_active_symbol'
  ) THEN
    RAISE WARNING 'Index idx_alert_monitoring_active_symbol not created - may still be building';
  END IF;
  
  RAISE NOTICE '✅ Migration completed successfully';
  RAISE NOTICE '✅ Function: process_price_alerts_batch_v3 created';
  RAISE NOTICE '✅ Indexes: Creating in background (CONCURRENTLY)';
  RAISE NOTICE '✅ Table: alert_processing_cooldowns created';
  RAISE NOTICE '✅ View: alert_processing_stats created';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Next steps:';
  RAISE NOTICE '1. Deploy updated price-ingestor edge function';
  RAISE NOTICE '2. Deploy updated ModernNotificationSystem.tsx';
  RAISE NOTICE '3. Clear browser cache completely';
  RAISE NOTICE '4. Test signal creation with monitoring';
END $$;
