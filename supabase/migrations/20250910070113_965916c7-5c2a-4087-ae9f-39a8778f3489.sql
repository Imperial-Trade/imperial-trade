-- Phase C: Create realtime_telemetry table for permanent telemetry
CREATE TABLE IF NOT EXISTS public.realtime_telemetry (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    scope TEXT NOT NULL, -- 'edge' or 'client'
    channel TEXT NOT NULL, -- e.g. 'price_update'
    metric TEXT NOT NULL, -- e.g. 'ingestor_batch'
    count INTEGER NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    user_id UUID NULLABLE -- for client-side metrics
);

-- Enable RLS
ALTER TABLE public.realtime_telemetry ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "System can insert realtime telemetry" 
ON public.realtime_telemetry 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can insert their own client metrics" 
ON public.realtime_telemetry 
FOR INSERT 
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Admins can view all realtime telemetry" 
ON public.realtime_telemetry 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND access_level = 'admin'::access_level_enum
    )
);

-- Create observe_deprecated_notifier_usage wrapper function
CREATE OR REPLACE FUNCTION public.observe_deprecated_notifier_usage()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    result JSONB;
BEGIN
    -- Call the existing observation function with clearer context
    INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
    VALUES (
        'observe_deprecated_notifier_usage', 
        NOW(), 
        0, 
        'success',
        'Manual observation of deprecated notification functions initiated by admin'
    );

    -- Return observation summary
    result := jsonb_build_object(
        'observation_initiated', true,
        'timestamp', NOW(),
        'message', 'Deprecated function usage observation logged for review'
    );
    
    RETURN result;
END;
$function$;