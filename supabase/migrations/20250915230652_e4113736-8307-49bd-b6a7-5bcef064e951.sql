-- Test the architectural refinement by updating prices to trigger live updates
UPDATE public.market_prices 
SET mid = mid + 0.01, 
    timestamp = now(), 
    updated_at = now()
WHERE symbol IN ('XAUUSD', 'BTCUSD');