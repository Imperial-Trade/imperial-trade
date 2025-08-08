
-- Ensure RLS is enabled on trade_alerts (idempotent)
ALTER TABLE public.trade_alerts ENABLE ROW LEVEL SECURITY;

-- Create an UPDATE policy that ONLY allows the educator owner to update their own PENDING alerts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'trade_alerts'
      AND policyname = 'Educator owners can update their pending alerts'
  ) THEN
    CREATE POLICY "Educator owners can update their pending alerts"
    ON public.trade_alerts
    FOR UPDATE
    TO authenticated
    USING (
      -- User must own the alert and it must currently be pending
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
      -- Ensure row still belongs to the same user post-update,
      -- and the actor remains an educator
      auth.uid() = user_id
      AND EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.user_type = 'educator'::public.user_type_enum
      )
    );
  END IF;
END
$$;
