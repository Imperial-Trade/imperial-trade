-- ============================================
-- FIX: Grant educator+ access to account requests and signals management
-- ============================================

-- Phase 1: Update account_requests RLS policies to include educator+
DROP POLICY IF EXISTS "Admins and moderators can view all account requests" ON public.account_requests;
CREATE POLICY "Admins, moderators, and educator+ can view all account requests"
ON public.account_requests
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'moderator'::app_role) OR 
  has_role(auth.uid(), 'educator+'::app_role)
);

DROP POLICY IF EXISTS "Admins and moderators can update account requests" ON public.account_requests;
CREATE POLICY "Admins, moderators, and educator+ can update account requests"
ON public.account_requests
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'moderator'::app_role) OR 
  has_role(auth.uid(), 'educator+'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'moderator'::app_role) OR 
  has_role(auth.uid(), 'educator+'::app_role)
);

DROP POLICY IF EXISTS "Admins and moderators can delete account requests" ON public.account_requests;
CREATE POLICY "Admins, moderators, and educator+ can delete account requests"
ON public.account_requests
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'moderator'::app_role) OR 
  has_role(auth.uid(), 'educator+'::app_role)
);

-- Phase 2: Ensure educator+ has proper access to view all trade_alerts (signals)
-- educator+ should be able to view all signals like admins do
DROP POLICY IF EXISTS "Educator+ can view all trade alerts" ON public.trade_alerts;
CREATE POLICY "Educator+ can view all trade alerts"
ON public.trade_alerts
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'educator+'::app_role));

-- Log the migration
INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
VALUES (
  'rls_educator_plus_access', 
  NOW(), 
  1, 
  'success',
  'Updated RLS policies to grant educator+ access to account_requests and trade_alerts'
);