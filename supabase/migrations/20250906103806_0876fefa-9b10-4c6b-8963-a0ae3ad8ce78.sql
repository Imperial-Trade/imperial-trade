-- Phase 1: Remove the dangerous policy that makes profiles publicly readable
DROP POLICY IF EXISTS "Users can view xeon subscription status" ON public.profiles;

-- Phase 2: Create secure RLS policies
-- Allow users to view their own profile data
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

-- Allow system/admin access when needed
CREATE POLICY "System and admins can access profile data" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (
  current_setting('role', true) = 'service_role' OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Phase 3: Create secure view for Xeon subscriber data
CREATE OR REPLACE VIEW public.xeon_subscribers_public AS
SELECT 
  id,
  display_name,
  xeon_stream_subscription,
  xeon_stream_activated_at
FROM public.profiles
WHERE account_status = 'active' 
  AND xeon_stream_subscription = true
  AND push_subscription_active = true;

-- Grant access to the view
GRANT SELECT ON public.xeon_subscribers_public TO authenticated;

-- Phase 4: Create security function for checking user's own Xeon subscription
CREATE OR REPLACE FUNCTION public.check_user_xeon_subscription(user_id_param UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id UUID;
  subscription_status BOOLEAN := false;
BEGIN
  -- If no user_id provided, use current authenticated user
  target_user_id := COALESCE(user_id_param, auth.uid());
  
  -- Security check: users can only check their own subscription unless they're admin
  IF target_user_id != auth.uid() AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: cannot check other users subscription status'
      USING ERRCODE = '42501';
  END IF;
  
  -- Get subscription status
  SELECT xeon_stream_subscription INTO subscription_status
  FROM public.profiles
  WHERE id = target_user_id;
  
  RETURN COALESCE(subscription_status, false);
END;
$$;