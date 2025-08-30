-- Fix CRITICAL security vulnerability: rate_limits table is publicly readable
-- This exposes user email addresses - need to restrict access immediately

-- Drop the overly permissive policy that allows public access
DROP POLICY IF EXISTS "System can manage rate limits" ON public.rate_limits;

-- Create secure policies that protect user email addresses
-- Only system/admin operations should access rate limits

-- 1. Allow system operations (for rate limit checking)
CREATE POLICY "System operations can manage rate limits" 
ON public.rate_limits 
FOR ALL 
USING (is_system_operation()) 
WITH CHECK (is_system_operation());

-- 2. Allow admins to view and manage rate limits for administration
CREATE POLICY "Admins can view rate limits for management" 
ON public.rate_limits 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND access_level = 'admin'::access_level_enum
  )
);

CREATE POLICY "Admins can delete rate limits for management" 
ON public.rate_limits 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND access_level = 'admin'::access_level_enum
  )
);

-- 3. Add function to anonymize rate limit identifiers for admin viewing (optional enhancement)
CREATE OR REPLACE FUNCTION public.get_anonymized_rate_limits()
RETURNS TABLE (
  id uuid,
  identifier_hash text,
  limit_type text,
  attempt_count integer,
  window_start timestamp with time zone,
  last_attempt timestamp with time zone,
  blocked_until timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow admins to call this function
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND access_level = 'admin'::access_level_enum
  ) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT 
    rl.id,
    CASE 
      WHEN rl.limit_type = 'email' THEN 
        'email:' || substring(encode(digest(rl.identifier, 'sha256'), 'hex'), 1, 8) || '...'
      ELSE 
        rl.identifier
    END as identifier_hash,
    rl.limit_type,
    rl.attempt_count,
    rl.window_start,
    rl.last_attempt,
    rl.blocked_until,
    rl.created_at,
    rl.updated_at
  FROM public.rate_limits rl
  ORDER BY rl.created_at DESC;
END;
$$;