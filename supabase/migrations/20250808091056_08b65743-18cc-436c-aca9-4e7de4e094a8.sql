
-- 1) Tighten UPDATE permissions for trade_alerts

-- Drop the broad UPDATE policy that undermines pending-only educator edits
DROP POLICY IF EXISTS "Creators and admins can update trade alerts" ON public.trade_alerts;

-- Recreate a restrictive educator-only, pending-only UPDATE policy
-- (If it already exists, we replace it to ensure RESTRICTIVE semantics)
DROP POLICY IF EXISTS "Educator owners can update their pending alerts" ON public.trade_alerts;

CREATE POLICY "Educator owners can update their pending alerts"
AS RESTRICTIVE
ON public.trade_alerts
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  AND status = 'pending'
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.user_type = 'educator'::public.user_type_enum
  )
)
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.user_type = 'educator'::public.user_type_enum
  )
);

-- 2) Optional function hardening: ensure search_path is locked to 'public'
-- These ALTERs do not change function bodies; they reduce risk from path hijacking.

ALTER FUNCTION public.set_activation_timestamp() SET search_path TO public;
ALTER FUNCTION public.create_alert_monitoring_entries() SET search_path TO public;
ALTER FUNCTION public.deactivate_alert_monitoring() SET search_path TO public;
ALTER FUNCTION public.process_price_alerts(p_symbol text, p_current_price numeric) SET search_path TO public;
ALTER FUNCTION public.expire_limit_orders() SET search_path TO public;
ALTER FUNCTION public.update_updated_at_column() SET search_path TO public;
ALTER FUNCTION public.cleanup_old_economic_events() SET search_path TO public;
ALTER FUNCTION public.cleanup_old_rate_limits() SET search_path TO public;
ALTER FUNCTION public.update_expired_sessions() SET search_path TO public;
ALTER FUNCTION public.log_account_request_changes() SET search_path TO public;
