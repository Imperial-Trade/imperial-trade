
-- 1) Remove the current view and its function (safe if they don't exist)
DROP VIEW IF EXISTS public.public_profiles;
DROP FUNCTION IF EXISTS public.get_public_profiles();

-- 2) Create a real cached table for public-facing profile data
CREATE TABLE IF NOT EXISTS public.public_profiles (
  id uuid PRIMARY KEY,
  display_name text,
  avatar_url text,
  role text,
  user_type public.user_type_enum,
  access_level public.access_level_enum,
  community_tier integer,
  trader_level text
);

-- 3) Lock down writes from clients, allow reads to authenticated
REVOKE ALL ON TABLE public.public_profiles FROM PUBLIC;
GRANT SELECT ON TABLE public.public_profiles TO authenticated;

-- 4) Backfill from profiles (only active accounts)
INSERT INTO public.public_profiles (id, display_name, avatar_url, role, user_type, access_level, community_tier, trader_level)
SELECT
  p.id,
  COALESCE(NULLIF(p.display_name, ''), p.real_name, p.role, 'Member') AS display_name,
  p.avatar_url,
  p.role,
  p.user_type,
  p.access_level,
  p.community_tier,
  p.trader_level
FROM public.profiles p
WHERE p.account_status = 'active'
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  avatar_url = EXCLUDED.avatar_url,
  role = EXCLUDED.role,
  user_type = EXCLUDED.user_type,
  access_level = EXCLUDED.access_level,
  community_tier = EXCLUDED.community_tier,
  trader_level = EXCLUDED.trader_level;

-- 5) Trigger function to keep public_profiles in sync
CREATE OR REPLACE FUNCTION public.sync_public_profiles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.public_profiles WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  -- INSERT or UPDATE on profiles
  IF NEW.account_status = 'active' THEN
    INSERT INTO public.public_profiles AS pp
      (id, display_name, avatar_url, role, user_type, access_level, community_tier, trader_level)
    VALUES (
      NEW.id,
      COALESCE(NULLIF(NEW.display_name, ''), NEW.real_name, NEW.role, 'Member'),
      NEW.avatar_url,
      NEW.role,
      NEW.user_type,
      NEW.access_level,
      NEW.community_tier,
      NEW.trader_level
    )
    ON CONFLICT (id) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      avatar_url = EXCLUDED.avatar_url,
      role = EXCLUDED.role,
      user_type = EXCLUDED.user_type,
      access_level = EXCLUDED.access_level,
      community_tier = EXCLUDED.community_tier,
      trader_level = EXCLUDED.trader_level;
  ELSE
    -- If account becomes non-active, remove from public view
    DELETE FROM public.public_profiles WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$func$;

-- 6) Triggers on profiles to keep the cache updated
DROP TRIGGER IF EXISTS trg_sync_public_profiles_insupd ON public.profiles;
CREATE TRIGGER trg_sync_public_profiles_insupd
AFTER INSERT OR UPDATE OF display_name, real_name, role, avatar_url, user_type, access_level, community_tier, trader_level, account_status
ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_public_profiles();

DROP TRIGGER IF EXISTS trg_sync_public_profiles_del ON public.profiles;
CREATE TRIGGER trg_sync_public_profiles_del
AFTER DELETE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_public_profiles();

-- 7) Optional: clarify intent
COMMENT ON TABLE public.public_profiles IS
  'Cached, read-only public-facing profile fields for cross-user display (synced from profiles via triggers).';
