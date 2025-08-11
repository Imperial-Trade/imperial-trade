-- Harden trade_alerts UPDATE authorization for educators only on pending rows
-- 1) Ensure RLS enabled
ALTER TABLE IF EXISTS public.trade_alerts ENABLE ROW LEVEL SECURITY;

-- 2) Drop any existing UPDATE policies on trade_alerts except our intended one
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'trade_alerts'
      AND cmd = 'UPDATE'
      AND policyname <> 'Educator owners can update their pending alerts'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.trade_alerts;', pol.policyname);
  END LOOP;
END $$;

-- 3) Create the strict educator-only pending UPDATE policy if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'trade_alerts' 
      AND policyname = 'Educator owners can update their pending alerts'
  ) THEN
    CREATE POLICY "Educator owners can update their pending alerts"
      ON public.trade_alerts
      FOR UPDATE
      TO authenticated
      USING (
        auth.uid() = user_id
        AND status = 'pending'
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.user_type = 'educator'::public.user_type_enum
        )
      )
      WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.user_type = 'educator'::public.user_type_enum
        )
      );
  END IF;
END $$;
