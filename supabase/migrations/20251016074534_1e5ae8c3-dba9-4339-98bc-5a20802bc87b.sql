-- ============================================
-- SIGNAL CREATION ACCESS CONTROL FIX
-- Only admin, educator, educator+ can create signals
-- Moderators and users are explicitly blocked
-- ============================================

-- Step 1: Drop old conflicting policies
DROP POLICY IF EXISTS "Admins and moderators (roles) can create trade alerts" ON public.trade_alerts;
DROP POLICY IF EXISTS "Educators and admins can create trade alerts" ON public.trade_alerts;

-- Step 2: Create single source of truth policy (user_roles table only)
CREATE POLICY "Only admins, educators, and educator+ can create signals"
ON public.trade_alerts
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'educator'::app_role) OR 
    has_role(auth.uid(), 'educator+'::app_role)
  )
);