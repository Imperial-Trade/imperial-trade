-- ============================================
-- PHASE 1: CRITICAL SECURITY & AUTHORIZATION
-- Task 1A: Fix RLS Policy - Add Admin Bypass for trade_alerts UPDATE
-- Task 1C: Restrict account_request_audit Access (CRITICAL SECURITY)
-- ============================================

-- ============================================
-- Task 1A: Fix trade_alerts UPDATE Policy with Admin Bypass
-- ============================================
DROP POLICY IF EXISTS "owners_can_update_their_own_trade_alerts" ON public.trade_alerts;

CREATE POLICY "owners_can_update_their_own_trade_alerts" ON public.trade_alerts
FOR UPDATE TO authenticated
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND (
      profiles.access_level = 'admin'::access_level_enum 
      OR profiles.role = 'admin'::text
    )
  )
)
WITH CHECK (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND (
      profiles.access_level = 'admin'::access_level_enum 
      OR profiles.role = 'admin'::text
    )
  )
);

-- ============================================
-- Task 1C: Restrict account_request_audit Access (CRITICAL SECURITY FIX)
-- Previously: Public read access exposed PII (emails, names, phone numbers)
-- Now: Only authenticated admins can view audit logs
-- ============================================
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.account_request_audit;
DROP POLICY IF EXISTS "System can create audit logs" ON public.account_request_audit;

-- Restrict SELECT to authenticated admins only
CREATE POLICY "Admins can view all audit logs" ON public.account_request_audit
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND (
      profiles.access_level = 'admin'::access_level_enum 
      OR profiles.role = 'admin'::text
    )
  )
);

-- Restrict INSERT to authenticated users (system operations)
CREATE POLICY "System can create audit logs" ON public.account_request_audit
FOR INSERT TO authenticated
WITH CHECK (true);

-- Log the security fix
INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
VALUES (
  'phase1_security_fixes', 
  NOW(), 
  2, 
  'success',
  'Phase 1 Complete: (1) Added admin bypass to trade_alerts UPDATE policy (2) Restricted account_request_audit to admins only - PII no longer publicly exposed'
);