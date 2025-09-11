-- Create edge_function_telemetry table for detailed edge function metrics
CREATE TABLE IF NOT EXISTS public.edge_function_telemetry (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    function_name TEXT NOT NULL,
    metric TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}',
    batch_id TEXT NULL
);

-- Enable RLS
ALTER TABLE public.edge_function_telemetry ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "System can insert edge function telemetry" 
ON public.edge_function_telemetry 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can view edge function telemetry" 
ON public.edge_function_telemetry 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_edge_telemetry_created_at ON public.edge_function_telemetry(created_at);
CREATE INDEX IF NOT EXISTS idx_edge_telemetry_function_metric ON public.edge_function_telemetry(function_name, metric);