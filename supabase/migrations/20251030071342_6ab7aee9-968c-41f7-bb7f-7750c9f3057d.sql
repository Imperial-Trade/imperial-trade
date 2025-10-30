-- Drop the outdated check_admin_consistency constraint
-- This constraint prevents proper role assignment from user_roles table
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS check_admin_consistency;

-- Update the sync trigger to also set the role field for consistency
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
    role = CASE
      WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = COALESCE(NEW.user_id, OLD.user_id) AND role = 'admin') THEN 'admin'
      WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = COALESCE(NEW.user_id, OLD.user_id) AND role = 'educator+') THEN 'educator+'
      WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = COALESCE(NEW.user_id, OLD.user_id) AND role = 'moderator') THEN 'moderator'
      WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = COALESCE(NEW.user_id, OLD.user_id) AND role = 'educator') THEN 'educator'
      ELSE 'user'
    END,
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

-- Now grant admin role to user d8a38919-b42c-4ba6-bb10-126bb908c6f8
SELECT add_user_role('d8a38919-b42c-4ba6-bb10-126bb908c6f8'::uuid, 'admin'::app_role);

-- Verify the role was added and profile was synced
SELECT 
  p.id,
  p.email,
  p.role,
  p.user_type,
  p.access_level,
  array_agg(ur.role ORDER BY ur.role) as user_roles
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
WHERE p.id = 'd8a38919-b42c-4ba6-bb10-126bb908c6f8'
GROUP BY p.id, p.email, p.role, p.user_type, p.access_level;