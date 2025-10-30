-- ============================================
-- CREATE: Missing process_price_alerts_batch_v3 Function
-- ============================================
-- This function is called by price-ingestor but was missing
-- It's a batch wrapper around process_price_alerts_enhanced_v2
-- ============================================

CREATE OR REPLACE FUNCTION public.process_price_alerts_batch_v3(
  p_symbols TEXT[],
  p_prices JSONB
)
RETURNS TABLE(
  alert_id UUID,
  signal_id UUID,
  symbol TEXT,
  alert_type TEXT,
  target_price NUMERIC,
  current_price NUMERIC,
  triggered BOOLEAN,
  priority_level INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_symbol TEXT;
  v_bid NUMERIC;
  v_ask NUMERIC;
  v_mid NUMERIC;
  v_price_data JSONB;
BEGIN
  -- ============================================
  -- Process each symbol individually
  -- ============================================
  FOREACH v_symbol IN ARRAY p_symbols
  LOOP
    -- Extract price data for this symbol
    v_price_data := p_prices->v_symbol;

    -- Skip if no price data for this symbol
    IF v_price_data IS NULL THEN
      CONTINUE;
    END IF;

    -- Extract bid, ask, mid prices
    v_bid := (v_price_data->>'bid')::NUMERIC;
    v_ask := (v_price_data->>'ask')::NUMERIC;
    v_mid := (v_price_data->>'mid')::NUMERIC;

    -- Validate price data
    IF v_bid IS NULL OR v_ask IS NULL THEN
      -- If bid/ask missing but mid present, estimate bid/ask
      IF v_mid IS NOT NULL THEN
        -- Simple estimation: spread of 0.0001 (1 pip for forex)
        v_bid := v_mid - 0.00005;
        v_ask := v_mid + 0.00005;
      ELSE
        -- Skip this symbol if no usable price data
        CONTINUE;
      END IF;
    END IF;

    -- Call the existing enhanced function for this symbol
    RETURN QUERY
    SELECT
      a.alert_id,
      a.signal_id,
      v_symbol::TEXT as symbol,
      a.alert_type,
      a.target_price,
      v_mid::NUMERIC as current_price,
      a.triggered,
      a.priority_level
    FROM process_price_alerts_enhanced_v2(v_symbol, v_bid, v_ask) a;
  END LOOP;

  RETURN;
END;
$$;

COMMENT ON FUNCTION process_price_alerts_batch_v3(TEXT[], JSONB) IS
  'Batch wrapper for process_price_alerts_enhanced_v2 - processes multiple symbols at once';
