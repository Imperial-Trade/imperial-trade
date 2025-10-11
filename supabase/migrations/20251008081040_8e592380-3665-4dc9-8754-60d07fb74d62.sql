-- ============================================
-- PHASE 1: DATABASE SCHEMA UPDATES
-- Role System Unification with educator+ role
-- ============================================

-- Step 1: Add 'educator+' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'educator+';

-- Step 2: Create RPC helper functions for role management

-- Check if user has ANY of the specified roles
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = ANY(_roles)
  )
$$;

-- Add role to user
CREATE OR REPLACE FUNCTION public.add_user_role(_user_id uuid, _role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- Remove role from user
CREATE OR REPLACE FUNCTION public.remove_user_role(_user_id uuid, _role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.user_roles
  WHERE user_id = _user_id AND role = _role;
END;
$$;

-- Get user roles as text array
CREATE OR REPLACE FUNCTION public.get_user_roles_array(_user_id uuid)
RETURNS text[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ARRAY_AGG(role::text)
  FROM public.user_roles
  WHERE user_id = _user_id
$$;

-- Step 3: Migrate existing data from profiles.access_level to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, 
  CASE 
    WHEN access_level = 'admin' THEN 'admin'::app_role
    WHEN access_level = 'moderator' THEN 'moderator'::app_role
    ELSE 'user'::app_role
  END
FROM public.profiles
WHERE access_level IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Migrate educator user_type to educator role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'educator'::app_role
FROM public.profiles
WHERE user_type = 'educator'
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 4: Deprecate old columns with comments
COMMENT ON COLUMN public.profiles.access_level IS 
'⚠️ DEPRECATED - Use user_roles table instead. This field will be removed in future version.';

COMMENT ON COLUMN public.profiles.user_type IS 
'⚠️ DEPRECATED - Use user_roles table instead. This field will be removed in future version.';

-- Log migration completion
INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
VALUES (
  'role_system_unification_migration', 
  NOW(), 
  (SELECT COUNT(*) FROM public.user_roles), 
  'success',
  'Successfully migrated role system to use user_roles table with educator+ support'
);