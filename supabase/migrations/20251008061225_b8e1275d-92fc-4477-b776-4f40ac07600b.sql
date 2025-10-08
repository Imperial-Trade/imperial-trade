-- ============================================
-- PHASE 1: Sync Existing Admin/Moderator Roles
-- ============================================

-- Insert missing admin/moderator roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT p.id, 
  CASE 
    WHEN p.access_level = 'admin' THEN 'admin'::app_role
    WHEN p.access_level = 'moderator' THEN 'moderator'::app_role
  END as role
FROM public.profiles p
WHERE p.access_level IN ('admin', 'moderator')
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = p.id 
      AND ur.role = CASE 
        WHEN p.access_level = 'admin' THEN 'admin'::app_role
        WHEN p.access_level = 'moderator' THEN 'moderator'::app_role
      END
  );

-- Log the sync operation
INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
SELECT 
  'admin_role_sync_migration',
  NOW(),
  COUNT(*),
  'success',
  'Synced ' || COUNT(*) || ' admin/moderator roles from profiles to user_roles'
FROM public.profiles p
WHERE p.access_level IN ('admin', 'moderator')
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = p.id 
      AND ur.role IN ('admin'::app_role, 'moderator'::app_role)
  );

-- ============================================
-- PHASE 2: Update RLS Policies to Support Moderators
-- ============================================

-- Drop existing admin-only policies
DROP POLICY IF EXISTS "Admins can view all account requests" ON public.account_requests;
DROP POLICY IF EXISTS "Admins can update account requests" ON public.account_requests;
DROP POLICY IF EXISTS "Admins can delete account requests" ON public.account_requests;

-- Create new policies that support both admins and moderators
CREATE POLICY "Admins and moderators can view all account requests"
ON public.account_requests
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'moderator'::app_role)
);

CREATE POLICY "Admins and moderators can update account requests"
ON public.account_requests
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'moderator'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'moderator'::app_role)
);

CREATE POLICY "Admins and moderators can delete account requests"
ON public.account_requests
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'moderator'::app_role)
);

-- ============================================
-- PHASE 3: Auto-Sync Trigger for Profile Changes
-- ============================================

-- Create function to sync profiles.access_level to user_roles
CREATE OR REPLACE FUNCTION public.sync_profile_to_user_roles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_role app_role;
  old_role app_role;
BEGIN
  -- Determine new role from access_level
  new_role := CASE 
    WHEN NEW.access_level = 'admin' THEN 'admin'::app_role
    WHEN NEW.access_level = 'moderator' THEN 'moderator'::app_role
    ELSE 'user'::app_role
  END;
  
  -- For UPDATE operations, determine old role
  IF TG_OP = 'UPDATE' THEN
    old_role := CASE 
      WHEN OLD.access_level = 'admin' THEN 'admin'::app_role
      WHEN OLD.access_level = 'moderator' THEN 'moderator'::app_role
      ELSE 'user'::app_role
    END;
    
    -- If role changed, delete old role
    IF old_role != new_role THEN
      DELETE FROM public.user_roles 
      WHERE user_id = NEW.id AND role = old_role;
    END IF;
  END IF;
  
  -- Insert new role (or do nothing if exists)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, new_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Log the sync
  INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
  VALUES (
    'profile_role_sync_trigger',
    NOW(),
    1,
    'success',
    format('Synced role for user %s: %s', NEW.id, new_role)
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger on profiles table
DROP TRIGGER IF EXISTS sync_profile_to_user_roles_trigger ON public.profiles;
CREATE TRIGGER sync_profile_to_user_roles_trigger
  AFTER INSERT OR UPDATE OF access_level, role
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_to_user_roles();

-- ============================================
-- PHASE 4: Auto-Assign Default User Role
-- ============================================

-- Create function to auto-assign 'user' role to new accounts
CREATE OR REPLACE FUNCTION public.assign_default_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Assign default 'user' role if no specific role assigned
  IF NEW.access_level IS NULL OR NEW.access_level = 'member' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user role assignment
DROP TRIGGER IF EXISTS assign_default_user_role_trigger ON public.profiles;
CREATE TRIGGER assign_default_user_role_trigger
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_default_user_role();

-- ============================================
-- VERIFICATION: Log Completion
-- ============================================

INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
VALUES (
  'admin_access_fix_migration',
  NOW(),
  1,
  'success',
  '✅ Complete Admin Access Fix Applied: Role sync completed, moderator support added, auto-sync triggers created'
);