-- Update market_prices table to support mid-only prices from Digital Ocean WebSocket
-- This enables the "Hydrate and Highlight" pattern with proper live data flow

-- Remove NOT NULL constraints from bid and ask columns to support mid-only prices
ALTER TABLE public.market_prices 
ALTER COLUMN bid DROP NOT NULL,
ALTER COLUMN ask DROP NOT NULL;

-- Update the existing market price upsert function to handle the new schema
CREATE OR REPLACE FUNCTION public.upsert_market_price_enhanced(
  p_symbol text, 
  p_bid numeric, 
  p_ask numeric, 
  p_mid numeric, 
  p_timestamp timestamp with time zone DEFAULT now()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Enhanced upsert that now works with nullable bid/ask for mid-only prices
    INSERT INTO public.market_prices (symbol, bid, ask, mid, timestamp, updated_at)
    VALUES (p_symbol, p_bid, p_ask, p_mid, p_timestamp, now())
    ON CONFLICT (symbol) 
    DO UPDATE SET 
        bid = EXCLUDED.bid,
        ask = EXCLUDED.ask,
        mid = EXCLUDED.mid,
        timestamp = EXCLUDED.timestamp,
        updated_at = now()
    WHERE 
        -- Only update if price actually changed (reduce unnecessary writes)
        market_prices.bid IS DISTINCT FROM EXCLUDED.bid OR
        market_prices.ask IS DISTINCT FROM EXCLUDED.ask OR
        market_prices.mid IS DISTINCT FROM EXCLUDED.mid OR
        market_prices.timestamp < EXCLUDED.timestamp - INTERVAL '1 second';
END;
$function$;