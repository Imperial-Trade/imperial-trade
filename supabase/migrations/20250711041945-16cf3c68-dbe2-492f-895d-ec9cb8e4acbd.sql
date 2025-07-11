
-- Create rate limiting table for server-side tracking
CREATE TABLE public.rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier TEXT NOT NULL, -- IP address or email
  limit_type TEXT NOT NULL, -- 'ip' or 'email'
  attempt_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_attempt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  blocked_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_rate_limits_identifier_type ON public.rate_limits (identifier, limit_type);
CREATE INDEX idx_rate_limits_window_start ON public.rate_limits (window_start);
CREATE INDEX idx_rate_limits_blocked_until ON public.rate_limits (blocked_until);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Create policies (allow system/edge functions to manage rate limits)
CREATE POLICY "System can manage rate limits" 
  ON public.rate_limits 
  FOR ALL 
  USING (true);

-- Create function to clean up old rate limit records
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Remove records older than 24 hours for email limits
  DELETE FROM public.rate_limits 
  WHERE limit_type = 'email' 
    AND window_start < now() - interval '24 hours';
  
  -- Remove records older than 1 hour for IP limits
  DELETE FROM public.rate_limits 
  WHERE limit_type = 'ip' 
    AND window_start < now() - interval '1 hour';
END;
$$;

-- Add trigger for updated_at
CREATE TRIGGER update_rate_limits_updated_at
  BEFORE UPDATE ON public.rate_limits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
