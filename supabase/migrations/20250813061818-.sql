-- Ensure authenticated users can execute the SECURITY DEFINER function used by the view
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_public_profiles'
  ) THEN
    GRANT EXECUTE ON FUNCTION public.get_public_profiles() TO authenticated;
  END IF;
END $$;