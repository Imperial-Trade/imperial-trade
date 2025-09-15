-- Clear static test data and update market price upsert function to handle mid-only prices
-- This enables the "Hydrate and Highlight" pattern with proper live data flow

-- First, clear any static test data from market_prices table
DELETE FROM public.market_prices WHERE symbol IN ('XAUUSD', 'BTCUSD');

-- Update the market price upsert function to handle mid-only prices properly
-- This allows price-ingestor to write mid-only prices from Digital Ocean WebSocket
CREATE OR REPLACE FUNCTION public.upsert_market_price_enhanced_midonly(
  p_symbol text, 
  p_bid numeric DEFAULT NULL, 
  p_ask numeric DEFAULT NULL, 
  p_mid numeric DEFAULT NULL, 
  p_timestamp timestamp with time zone DEFAULT now()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    -- Enhanced upsert that accepts mid-only prices
    -- Allows price-ingestor to write data even when only mid price is available
    INSERT INTO public.market_prices (symbol, bid, ask, mid, timestamp, updated_at)
    VALUES (p_symbol, p_bid, p_ask, p_mid, p_timestamp, now())
    ON CONFLICT (symbol) 
    DO UPDATE SET 
        bid = COALESCE(EXCLUDED.bid, market_prices.bid),
        ask = COALESCE(EXCLUDED.ask, market_prices.ask), 
        mid = COALESCE(EXCLUDED.mid, market_prices.mid),
        timestamp = EXCLUDED.timestamp,
        updated_at = now()
    WHERE 
        -- Update if any price field changed or timestamp is newer
        market_prices.bid IS DISTINCT FROM EXCLUDED.bid OR
        market_prices.ask IS DISTINCT FROM EXCLUDED.ask OR
        market_prices.mid IS DISTINCT FROM EXCLUDED.mid OR
        market_prices.timestamp < EXCLUDED.timestamp - INTERVAL '1 second';
END;
$function$;