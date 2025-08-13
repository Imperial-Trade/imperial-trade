-- Replace public_profiles table with a secure read-only view backed by profiles
-- 1) If a table named public_profiles exists, back it up and drop it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'public_profiles'
  ) THEN
    -- Backup existing data for safety (one-time snapshot)
    EXECUTE 'CREATE TABLE IF NOT EXISTS public.public_profiles_backup AS TABLE public.public_profiles';
    -- Drop the old table to allow creating a view with the same name
    EXECUTE 'DROP TABLE public.public_profiles';
  END IF;
END$$;

-- 2) Create a SECURITY DEFINER function to safely expose public profile fields bypassing RLS
CREATE OR REPLACE FUNCTION public.get_public_profiles()
RETURNS TABLE (
  id uuid,
  display_name text,
  avatar_url text,
  role text,
  user_type public.user_type_enum,
  access_level public.access_level_enum,
  community_tier integer,
  trader_level text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT 
    p.id,
    COALESCE(NULLIF(p.display_name, ''), p.real_name, p.role, 'Member') AS display_name,
    p.avatar_url,
    p.role,
    p.user_type,
    p.access_level,
    p.community_tier,
    p.trader_level
  FROM public.profiles AS p
  WHERE p.account_status = 'active'
$$;

-- 3) Create a view with the original name to preserve all existing SELECT usages
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT * FROM public.get_public_profiles();

-- 4) Grant read access to authenticated users (no writes possible on a view)
GRANT SELECT ON public.public_profiles TO authenticated;

-- Optional: comment for maintainers
COMMENT ON VIEW public.public_profiles IS 'Read-only view exposing public profile fields with display_name fallback, safe for cross-user display. Backed by SECURITY DEFINER function.';