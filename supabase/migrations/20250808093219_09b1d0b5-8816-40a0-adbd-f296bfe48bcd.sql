-- Policy to allow owners and admins to update active or pending trade alerts without 406 errors
-- Idempotent and safe: wrap CREATE POLICY in exception handler to avoid duplicate errors

-- Ensure RLS is enabled (idempotent)
ALTER TABLE public.trade_alerts ENABLE ROW LEVEL SECURITY;

-- Allow owners and admins to update alerts that are currently pending or active.
-- USING applies to the existing row (OLD), WITH CHECK applies to the new row (NEW).
-- We purposefully do NOT restrict NEW.status so transitions like active -> closed remain allowed.
DO $$
BEGIN
  CREATE POLICY "Owners/admin can update non-closed alerts"
  ON public.trade_alerts
  FOR UPDATE
  USING (
    status IN ('pending','active')
    AND (
      auth.uid() = user_id
      OR public.has_role(auth.uid(), 'admin'::app_role)
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- Policy already exists
END
$$;

-- Optional: make updates return a row if it exists but avoid 406 on client
-- (Handled client-side via .maybeSingle(); included here for documentation only)
