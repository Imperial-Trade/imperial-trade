-- =============================================
-- FIX: Update assign_default_user_role() to use 'user' instead of 'member'
-- =============================================

CREATE OR REPLACE FUNCTION public.assign_default_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Assign default 'user' role if no specific role assigned
  -- FIXED: Changed 'member' to 'user' to match standardized enum
  IF NEW.access_level IS NULL OR NEW.access_level = 'user'::access_level_enum THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;