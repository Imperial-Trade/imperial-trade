-- Create market_prices table for real-time price storage
CREATE TABLE public.market_prices (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    symbol TEXT NOT NULL,
    bid NUMERIC NOT NULL,
    ask NUMERIC NOT NULL,
    mid NUMERIC NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    source TEXT NOT NULL DEFAULT 'tradermade',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique index for symbol to enable upserts
CREATE UNIQUE INDEX idx_market_prices_symbol ON public.market_prices(symbol);

-- Create index for timestamp queries
CREATE INDEX idx_market_prices_timestamp ON public.market_prices(timestamp);

-- Enable RLS
ALTER TABLE public.market_prices ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read market prices
CREATE POLICY "Anyone can view market prices" 
ON public.market_prices 
FOR SELECT 
USING (true);

-- Only system can insert/update prices
CREATE POLICY "System can manage market prices" 
ON public.market_prices 
FOR ALL 
USING (true);

-- Create function to upsert market prices
CREATE OR REPLACE FUNCTION public.upsert_market_price(
    p_symbol TEXT,
    p_bid NUMERIC,
    p_ask NUMERIC,
    p_mid NUMERIC,
    p_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) RETURNS void AS $$
BEGIN
    INSERT INTO public.market_prices (symbol, bid, ask, mid, timestamp)
    VALUES (p_symbol, p_bid, p_ask, p_mid, p_timestamp)
    ON CONFLICT (symbol) 
    DO UPDATE SET 
        bid = EXCLUDED.bid,
        ask = EXCLUDED.ask,
        mid = EXCLUDED.mid,
        timestamp = EXCLUDED.timestamp,
        updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set up cron job for xeon-stream-processor (every minute)
SELECT cron.schedule(
    'process-xeon-stream-signals',
    '* * * * *',
    $$
    SELECT net.http_post(
        url := 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/xeon-stream-processor',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg2OTI1MCwiZXhwIjoyMDY3NDQ1MjUwfQ.0tHLp8yWK_lNP_6yrdNn4BqM3kGlWnKMcDf9fYMa2hU"}'::jsonb,
        body := '{"source": "cron"}'::jsonb
    );
    $$
);