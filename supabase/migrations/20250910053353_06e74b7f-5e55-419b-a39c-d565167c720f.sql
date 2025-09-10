-- Create persistent telemetry table for realtime optimization tracking
CREATE TABLE IF NOT EXISTS public.realtime_telemetry (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_messages INTEGER NOT NULL DEFAULT 0,
  total_connections INTEGER NOT NULL DEFAULT 0,
  message_rate NUMERIC NOT NULL DEFAULT 0,
  cost_estimate NUMERIC NOT NULL DEFAULT 0,
  optimization_rate NUMERIC NOT NULL DEFAULT 0,
  clamp_activations INTEGER NOT NULL DEFAULT 0,
  channel_breakdown JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.realtime_telemetry ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can view all telemetry"
ON public.realtime_telemetry
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND access_level = 'admin'::access_level_enum
  )
);

CREATE POLICY "System can manage telemetry"
ON public.realtime_telemetry
FOR ALL
USING (true);

-- Create unique index for daily aggregation
CREATE UNIQUE INDEX IF NOT EXISTS idx_realtime_telemetry_date 
ON public.realtime_telemetry (date);

-- Create function to upsert daily telemetry
CREATE OR REPLACE FUNCTION public.upsert_daily_telemetry(
  p_messages INTEGER,
  p_connections INTEGER,
  p_message_rate NUMERIC,
  p_cost_estimate NUMERIC,
  p_optimization_rate NUMERIC DEFAULT 85,
  p_clamp_activations INTEGER DEFAULT 0,
  p_channel_breakdown JSONB DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.realtime_telemetry (
    date, total_messages, total_connections, message_rate, 
    cost_estimate, optimization_rate, clamp_activations, channel_breakdown
  ) VALUES (
    CURRENT_DATE, p_messages, p_connections, p_message_rate,
    p_cost_estimate, p_optimization_rate, p_clamp_activations, p_channel_breakdown
  )
  ON CONFLICT (date) 
  DO UPDATE SET
    total_messages = EXCLUDED.total_messages,
    total_connections = EXCLUDED.total_connections,
    message_rate = EXCLUDED.message_rate,
    cost_estimate = EXCLUDED.cost_estimate,
    optimization_rate = EXCLUDED.optimization_rate,
    clamp_activations = EXCLUDED.clamp_activations,
    channel_breakdown = EXCLUDED.channel_breakdown,
    updated_at = now();
END;
$$;