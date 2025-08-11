-- Restrict updates on trade_alerts to ONLY the owner (educator who posted it)
-- Remove previous admin-permissive policy and add strict owner-only policy

-- Ensure RLS is enabled (idempotent)
ALTER TABLE public.trade_alerts ENABLE ROW LEVEL SECURITY;

-- Drop the prior policy if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'trade_alerts' 
      AND policyname = 'Owners/admin can update non-closed alerts'
  ) THEN
    EXECUTE 'DROP POLICY "Owners/admin can update non-closed alerts" ON public.trade_alerts';
  END IF;
END $$;

-- Create owner-only update policy
DO $$
BEGIN
  CREATE POLICY "Only owners can update trade alerts"
  ON public.trade_alerts
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- Policy already exists
END $$;