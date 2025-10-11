-- ============================================
-- Phase 1.5: Critical Security Fix - Privilege Escalation
-- Fixes ERROR #11 & ERROR #12: Replace profiles table role checks with has_role()
-- ============================================

-- Drop incorrectly implemented policies from Phase 1
DROP POLICY IF EXISTS "owners_can_update_their_own_trade_alerts" ON public.trade_alerts;
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.account_request_audit;

-- ============================================
-- Task 1.5A: Recreate RLS policies using has_role()
-- ============================================

-- Fix trade_alerts UPDATE policy (ERROR #12)
CREATE POLICY "owners_can_update_their_own_trade_alerts"
ON public.trade_alerts
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Fix account_request_audit SELECT policy (ERROR #11)
CREATE POLICY "Admins can view all audit logs"
ON public.account_request_audit
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
);

-- ============================================
-- Task 1.5B: Create RPC function for client-side role checking
-- This allows useAuthorizationAware hook to securely check roles
-- ============================================

CREATE OR REPLACE FUNCTION public.get_user_roles(p_user_id uuid DEFAULT auth.uid())
RETURNS TABLE(role app_role)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = p_user_id;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_roles TO authenticated;

-- ============================================
-- Log successful migration
-- ============================================
INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
VALUES (
  'phase_1_5_security_fix', 
  NOW(), 
  2, 
  'success',
  'Phase 1.5 Complete - Fixed privilege escalation vulnerabilities (ERROR #11, #12). All RLS policies now use has_role(). Created get_user_roles() RPC for client-side checks.'
);