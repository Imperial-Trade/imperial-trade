-- Populate market_prices with current data for testing
-- This ensures the "Hydrate and Subscribe" pattern has immediate data
INSERT INTO public.market_prices (symbol, bid, ask, mid, timestamp, updated_at)
VALUES 
  ('XAUUSD', 2658.50, 2659.50, 2659.00, now(), now()),
  ('BTCUSD', 115332.44, 115333.44, 115332.94, now(), now())
ON CONFLICT (symbol) 
DO UPDATE SET 
  bid = EXCLUDED.bid,
  ask = EXCLUDED.ask,
  mid = EXCLUDED.mid,
  timestamp = EXCLUDED.timestamp,
  updated_at = now();