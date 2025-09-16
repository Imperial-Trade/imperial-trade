-- Phase 1: Create ultra-fast market price RPC function
CREATE OR REPLACE FUNCTION get_latest_market_price(p_symbol text)
RETURNS TABLE(symbol text, price numeric, timestamp timestamptz, age_seconds integer, bid numeric, ask numeric, mid numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mp.symbol,
        COALESCE(mp.mid, mp.ask, mp.bid) as price,
        mp.updated_at as timestamp,
        EXTRACT(EPOCH FROM (now() - mp.updated_at))::integer as age_seconds,
        mp.bid,
        mp.ask,
        mp.mid
    FROM public.market_prices mp
    WHERE mp.symbol = UPPER(p_symbol)
    LIMIT 1;
END;
$$;