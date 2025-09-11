-- Create realtime_telemetry table for permanent performance tracking
CREATE TABLE public.realtime_telemetry (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    scope TEXT NOT NULL CHECK (scope IN ('edge', 'client')),
    channel TEXT NOT NULL,
    metric TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}',
    user_id UUID NULL
);

-- Enable RLS
ALTER TABLE public.realtime_telemetry ENABLE ROW LEVEL SECURITY;

-- RLS policies for telemetry
CREATE POLICY "System can insert edge telemetry" 
ON public.realtime_telemetry 
FOR INSERT 
WITH CHECK (scope = 'edge');

CREATE POLICY "Users can insert their own client telemetry" 
ON public.realtime_telemetry 
FOR INSERT 
WITH CHECK (scope = 'client' AND auth.uid() = user_id);

CREATE POLICY "Users can view their own client telemetry" 
ON public.realtime_telemetry 
FOR SELECT 
USING (scope = 'client' AND auth.uid() = user_id);

CREATE POLICY "Admins can view all telemetry" 
ON public.realtime_telemetry 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add index for performance
CREATE INDEX idx_realtime_telemetry_created_at ON public.realtime_telemetry(created_at);
CREATE INDEX idx_realtime_telemetry_scope_metric ON public.realtime_telemetry(scope, metric);

-- Create upsert_market_price_enhanced function if it doesn't exist
CREATE OR REPLACE FUNCTION public.upsert_market_price_enhanced(
    p_symbol TEXT, 
    p_bid NUMERIC, 
    p_ask NUMERIC, 
    p_mid NUMERIC, 
    p_timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;