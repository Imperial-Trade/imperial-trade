-- ============================================
-- PHASE 3: Owner-Only RLS Policies for trade_alerts
-- This enforces that ONLY signal creators can modify their own signals
-- Admins CANNOT modify others' signals from UI (only via direct SQL if needed)
-- ============================================

-- Step 1: Drop ALL existing conflicting UPDATE policies
DROP POLICY IF EXISTS "Admins can update all alerts" ON public.trade_alerts;
DROP POLICY IF EXISTS "Educator owners can update their pending alerts" ON public.trade_alerts;
DROP POLICY IF EXISTS "Owners or admins can update trade alerts" ON public.trade_alerts;
DROP POLICY IF EXISTS "System can update alerts for price monitoring" ON public.trade_alerts;
DROP POLICY IF EXISTS "Users can update their own alerts" ON public.trade_alerts;
DROP POLICY IF EXISTS "admins_can_update_all_signals" ON public.trade_alerts;
DROP POLICY IF EXISTS "signal_owners_can_update_their_signals" ON public.trade_alerts;

-- Step 2: Create ONE clear policy - OWNERS ONLY
CREATE POLICY "owners_can_update_their_own_trade_alerts"
ON public.trade_alerts
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Step 3: Create separate policy for SYSTEM operations (auto-close, TP hits, limit order activation)
CREATE POLICY "system_can_update_for_automation"
ON public.trade_alerts
FOR UPDATE
TO authenticated
USING (public.is_system_operation())
WITH CHECK (public.is_system_operation());

-- Log the migration
INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
VALUES (
  'rls_policy_consolidation', 
  NOW(), 
  2, 
  'success',
  'Consolidated 7 UPDATE policies into 2 clear owner-only policies for trade_alerts'
);