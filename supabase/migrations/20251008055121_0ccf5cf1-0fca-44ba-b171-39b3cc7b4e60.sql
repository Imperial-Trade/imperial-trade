-- ============================================
-- Phase 1.8A: Add Missing Admin Roles
-- ============================================

-- Add missing admin roles for the two users
INSERT INTO public.user_roles (user_id, role)
VALUES 
  ('401c90b2-5e2c-4a95-8252-d351525c3cb8', 'admin'), -- ultimamarkets.world@gmail.com
  ('a38ec03c-cd06-41c8-966b-434c4122aaa9', 'admin')  -- ntiu88@gmail.com
ON CONFLICT (user_id, role) DO NOTHING;

-- ============================================
-- Phase 1.8D: Fallback Safety Trigger
-- ============================================

-- Function to assign default 'user' role on account creation
CREATE OR REPLACE FUNCTION public.assign_default_role()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only assign if no role exists yet (prevents overwriting manual assignments)
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = NEW.id
  ) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Log the automatic role assignment
    INSERT INTO public.cron_job_logs (
      job_name, 
      execution_time, 
      records_affected, 
      status, 
      error_message
    )
    VALUES (
      'auto_role_assignment', 
      NOW(), 
      1, 
      'success',
      'Automatically assigned "user" role to new user: ' || NEW.email
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_default_role();