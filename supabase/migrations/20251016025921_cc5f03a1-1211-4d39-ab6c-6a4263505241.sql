-- ============================================
-- COMPLETE FIX: Signal Stream Access for All Users
-- ============================================

-- FIX 1: Add RLS Policy - Allow all authenticated users to view educator/admin profiles
CREATE POLICY "Authenticated users can view educator profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  user_type IN ('educator', 'admin') 
  OR access_level IN ('admin', 'moderator')
);

-- FIX 2A: Immediate fix for jackmamaster11@gmail.com
UPDATE public.profiles
SET 
  user_type = 'educator'::user_type_enum,
  access_level = 'moderator'::access_level_enum,
  updated_at = now()
WHERE email = 'jackmamaster11@gmail.com';

-- FIX 2B: One-time sync - Update ALL profiles to match their user_roles
UPDATE public.profiles p
SET 
  user_type = CASE
    WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p.id AND role = 'admin') THEN 'admin'::user_type_enum
    WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p.id AND role IN ('educator', 'educator+')) THEN 'educator'::user_type_enum
    ELSE 'user'::user_type_enum
  END,
  access_level = CASE
    WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p.id AND role = 'admin') THEN 'admin'::access_level_enum
    WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p.id AND role IN ('educator+', 'moderator')) THEN 'moderator'::access_level_enum
    ELSE 'user'::access_level_enum
  END,
  updated_at = now()
WHERE EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p.id);

-- FIX 3: Create trigger to auto-sync profiles when user_roles changes (future-proofing)
CREATE OR REPLACE FUNCTION public.sync_profile_from_roles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update profile based on highest role in user_roles table
  UPDATE public.profiles
  SET 
    user_type = CASE
      WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = COALESCE(NEW.user_id, OLD.user_id) AND role = 'admin') THEN 'admin'::user_type_enum
      WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = COALESCE(NEW.user_id, OLD.user_id) AND role IN ('educator', 'educator+')) THEN 'educator'::user_type_enum
      ELSE 'user'::user_type_enum
    END,
    access_level = CASE
      WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = COALESCE(NEW.user_id, OLD.user_id) AND role = 'admin') THEN 'admin'::access_level_enum
      WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = COALESCE(NEW.user_id, OLD.user_id) AND role IN ('educator+', 'moderator')) THEN 'moderator'::access_level_enum
      ELSE 'user'::access_level_enum
    END,
    updated_at = now()
  WHERE id = COALESCE(NEW.user_id, OLD.user_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger on user_roles table
CREATE TRIGGER sync_profile_on_role_change
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_from_roles();