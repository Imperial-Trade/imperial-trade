-- Drop existing objects if they exist
DROP TRIGGER IF EXISTS update_educator_cache_trigger ON public.profiles;
DROP TRIGGER IF EXISTS refresh_cache_on_role_change_trigger ON public.user_roles;
DROP FUNCTION IF EXISTS public.update_educator_profile_cache();
DROP FUNCTION IF EXISTS public.refresh_educator_cache_on_role_change();
DROP FUNCTION IF EXISTS public.update_educator_profile_cache_direct(UUID);

-- Add roles column to cached_educator_profiles if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'cached_educator_profiles' 
    AND column_name = 'roles'
  ) THEN
    ALTER TABLE public.cached_educator_profiles ADD COLUMN roles TEXT[] DEFAULT '{}';
  END IF;
END $$;

-- ✅ FIXED: Function checks user_roles table instead of profiles.user_type
CREATE OR REPLACE FUNCTION public.update_educator_profile_cache()
RETURNS TRIGGER AS $$
DECLARE
  user_roles TEXT[];
  should_cache BOOLEAN;
BEGIN
  -- Get all roles for this user from user_roles table
  SELECT ARRAY_AGG(role::text)
  INTO user_roles
  FROM public.user_roles
  WHERE user_id = NEW.id;
  
  -- Check if user has any educator/admin/moderator roles
  should_cache := user_roles && ARRAY['admin', 'educator', 'educator+', 'moderator'];
  
  IF should_cache THEN
    INSERT INTO public.cached_educator_profiles (
      user_id,
      display_name,
      avatar_url,
      user_type,
      roles,
      last_updated
    ) VALUES (
      NEW.id,
      COALESCE(NULLIF(trim(NEW.display_name), ''), NULLIF(trim(NEW.real_name), ''), 'Unknown Trader'),
      NEW.avatar_url,
      COALESCE(NEW.user_type::text, 'user'),
      user_roles,
      NOW()
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
      display_name = COALESCE(NULLIF(trim(EXCLUDED.display_name), ''), 'Unknown Trader'),
      avatar_url = EXCLUDED.avatar_url,
      user_type = EXCLUDED.user_type,
      roles = EXCLUDED.roles,
      last_updated = NOW();
  ELSE
    -- Remove from cache if user no longer has privileged roles
    DELETE FROM public.cached_educator_profiles WHERE user_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on profile updates
CREATE TRIGGER update_educator_cache_trigger
  AFTER INSERT OR UPDATE OF display_name, avatar_url, user_type ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_educator_profile_cache();

-- Helper function to refresh cache for a specific user
CREATE OR REPLACE FUNCTION public.update_educator_profile_cache_direct(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  user_roles TEXT[];
  profile_record RECORD;
  should_cache BOOLEAN;
BEGIN
  -- Get profile
  SELECT * INTO profile_record
  FROM public.profiles
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Get roles
  SELECT ARRAY_AGG(role::text)
  INTO user_roles
  FROM public.user_roles
  WHERE user_id = p_user_id;
  
  -- Check if should cache
  should_cache := user_roles && ARRAY['admin', 'educator', 'educator+', 'moderator'];
  
  IF should_cache THEN
    INSERT INTO public.cached_educator_profiles (
      user_id,
      display_name,
      avatar_url,
      user_type,
      roles,
      last_updated
    ) VALUES (
      p_user_id,
      COALESCE(NULLIF(trim(profile_record.display_name), ''), NULLIF(trim(profile_record.real_name), ''), 'Unknown Trader'),
      profile_record.avatar_url,
      COALESCE(profile_record.user_type::text, 'user'),
      user_roles,
      NOW()
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
      display_name = COALESCE(NULLIF(trim(EXCLUDED.display_name), ''), 'Unknown Trader'),
      avatar_url = EXCLUDED.avatar_url,
      user_type = EXCLUDED.user_type,
      roles = EXCLUDED.roles,
      last_updated = NOW();
  ELSE
    DELETE FROM public.cached_educator_profiles WHERE user_id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ✅ NEW: Trigger when roles change in user_roles table
CREATE OR REPLACE FUNCTION public.refresh_educator_cache_on_role_change()
RETURNS TRIGGER AS $$
DECLARE
  profile_record RECORD;
BEGIN
  -- Get the profile for this user
  SELECT * INTO profile_record
  FROM public.profiles
  WHERE id = COALESCE(NEW.user_id, OLD.user_id);
  
  IF FOUND THEN
    -- Trigger the cache update
    PERFORM public.update_educator_profile_cache_direct(profile_record.id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER refresh_cache_on_role_change_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.refresh_educator_cache_on_role_change();

-- Clear existing cache and repopulate from user_roles table
TRUNCATE public.cached_educator_profiles;

INSERT INTO public.cached_educator_profiles (user_id, display_name, avatar_url, user_type, roles, last_updated)
SELECT 
  p.id,
  COALESCE(NULLIF(trim(p.display_name), ''), NULLIF(trim(p.real_name), ''), 'Unknown Trader'),
  p.avatar_url,
  COALESCE(p.user_type::text, 'user'),
  ARRAY_AGG(DISTINCT ur.role::text) as roles,
  NOW()
FROM public.profiles p
INNER JOIN public.user_roles ur ON ur.user_id = p.id
WHERE ur.role IN ('admin', 'educator', 'educator+', 'moderator')
GROUP BY p.id, p.display_name, p.real_name, p.avatar_url, p.user_type
ON CONFLICT (user_id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  avatar_url = EXCLUDED.avatar_url,
  user_type = EXCLUDED.user_type,
  roles = EXCLUDED.roles,
  last_updated = EXCLUDED.last_updated;