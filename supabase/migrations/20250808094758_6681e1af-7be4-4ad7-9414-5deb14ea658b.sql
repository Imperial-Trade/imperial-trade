
-- Ensure RLS is enabled (idempotent)
ALTER TABLE public.trade_alerts ENABLE ROW LEVEL SECURITY;

-- Drop prior update policies if they exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'trade_alerts' 
      AND policyname = 'Only owners can update trade alerts'
  ) THEN
    EXECUTE 'DROP POLICY "Only owners can update trade alerts" ON public.trade_alerts';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'trade_alerts' 
      AND policyname = 'Owners/admin can update non-closed alerts'
  ) THEN
    EXECUTE 'DROP POLICY "Owners/admin can update non-closed alerts" ON public.trade_alerts';
  END IF;
END $$;

-- Create owner or admin update policy
DO $$
BEGIN
  CREATE POLICY "Owners or admins can update trade alerts"
  ON public.trade_alerts
  FOR UPDATE
  USING (
    -- Existing row must belong to the current user OR the current user must be an admin
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    -- New row must still be consistent with owner OR admin acting
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- Policy already exists
END $$;
