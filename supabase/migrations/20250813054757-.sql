-- Make trade alerts visible to all authenticated users
-- 1) Ensure RLS is enabled
ALTER TABLE public.trade_alerts ENABLE ROW LEVEL SECURITY;

-- 2) Create a permissive SELECT policy for all authenticated users
CREATE POLICY "All authenticated users can view trade alerts"
ON public.trade_alerts
FOR SELECT
TO authenticated
USING (true);

-- 3) Improve realtime payload completeness and ensure table is in publication
ALTER TABLE public.trade_alerts REPLICA IDENTITY FULL;
DO $$
BEGIN
  -- Add to publication if not already present
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'trade_alerts'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.trade_alerts';
  END IF;
END$$;