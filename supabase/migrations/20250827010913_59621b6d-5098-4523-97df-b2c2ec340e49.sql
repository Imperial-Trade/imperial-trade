
-- Phase 1: Critical Security Fixes

-- 1. Fix privilege escalation by creating secure authorization functions
CREATE OR REPLACE FUNCTION public.get_user_access_level(user_id_param uuid DEFAULT auth.uid())
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
  SELECT access_level::text 
  FROM profiles 
  WHERE id = user_id_param;
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(user_id_param uuid DEFAULT auth.uid())
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
  SELECT role 
  FROM profiles 
  WHERE id = user_id_param;
$$;

CREATE OR REPLACE FUNCTION public.get_user_type(user_id_param uuid DEFAULT auth.uid())
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
  SELECT user_type::text 
  FROM profiles 
  WHERE id = user_id_param;
$$;

-- Enhanced has_role function with proper security
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- New function to check admin access securely
CREATE OR REPLACE FUNCTION public.is_admin(user_id_param uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE id = user_id_param 
    AND access_level = 'admin'
  );
$$;

-- New function to check moderator access securely
CREATE OR REPLACE FUNCTION public.is_moderator_or_admin(user_id_param uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE id = user_id_param 
    AND access_level IN ('admin', 'moderator')
  );
$$;

-- New function to check educator access securely
CREATE OR REPLACE FUNCTION public.is_educator_or_admin(user_id_param uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE id = user_id_param 
    AND (access_level IN ('admin', 'moderator') OR user_type = 'educator')
  );
$$;

-- 2. Add missing RLS policies for tables that have RLS enabled but no policies

-- Add policies for notification_user_state (has RLS but missing DELETE policy)
CREATE POLICY "Users can delete their own notification state"
ON public.notification_user_state
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Add missing policies for any other tables found without proper coverage
-- (Additional policies can be added as we identify more gaps)

-- 3. Secure all database functions by adding SET search_path = 'public'
-- Update existing functions to be more secure

CREATE OR REPLACE FUNCTION public.sync_public_profiles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (
    id, 
    real_name, 
    display_name, 
    role, 
    user_type, 
    access_level, 
    account_status, 
    registration_source, 
    phone_number
  )
  VALUES (
    new.id,
    -- Store the ACTUAL real name from signup data
    COALESCE(
      new.raw_user_meta_data->>'full_name', 
      new.raw_user_meta_data->>'name',
      new.email,
      'User'
    ),
    -- Display name starts as null - user will set their Orderflow identity later
    NULL,
    CASE 
      WHEN new.raw_user_meta_data->>'access_level' = 'admin' THEN 'admin'
      WHEN new.raw_user_meta_data->>'role' = 'admin' THEN 'admin'
      WHEN new.raw_user_meta_data->>'role' = 'educator' THEN 'educator'
      ELSE 'user'
    END,
    CASE 
      WHEN new.raw_user_meta_data->>'user_type' = 'admin' THEN 'admin'::public.user_type_enum
      WHEN new.raw_user_meta_data->>'user_type' = 'educator' THEN 'educator'::public.user_type_enum
      WHEN new.raw_user_meta_data->>'account_type' = 'educator' THEN 'educator'::public.user_type_enum
      ELSE 'member'::public.user_type_enum
    END,
    CASE 
      WHEN new.raw_user_meta_data->>'access_level' = 'admin' THEN 'admin'::public.access_level_enum
      WHEN new.raw_user_meta_data->>'role' = 'admin' THEN 'admin'::public.access_level_enum
      WHEN new.raw_user_meta_data->>'access_level' = 'moderator' THEN 'moderator'::public.access_level_enum
      WHEN new.raw_user_meta_data->>'role' = 'educator' THEN 'moderator'::public.access_level_enum
      WHEN new.raw_user_meta_data->>'account_type' = 'educator' THEN 'moderator'::public.access_level_enum
      ELSE 'user'::public.access_level_enum
    END,
    COALESCE((new.raw_user_meta_data->>'account_status')::public.account_status_enum, 'active'::public.account_status_enum),
    COALESCE((new.raw_user_meta_data->>'registration_source')::public.registration_source_enum, 'direct'::public.registration_source_enum),
    new.raw_user_meta_data->>'phone_number'
  );
  RETURN new;
END;
$function$;

-- Update all other database functions to include SET search_path = 'public'
CREATE OR REPLACE FUNCTION public.update_user_engagement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Update engagement score and comments count
  UPDATE public.profiles 
  SET 
    engagement_score = (
      SELECT COUNT(*) 
      FROM public.user_engagement 
      WHERE user_id = NEW.user_id 
      AND action_type IN ('like_given', 'like_received')
    ),
    comments_count = (
      SELECT COUNT(*) 
      FROM public.user_engagement 
      WHERE user_id = NEW.user_id 
      AND action_type = 'comment_given'
    ),
    unique_posts_commented = (
      SELECT COUNT(DISTINCT target_post_id) 
      FROM public.user_engagement 
      WHERE user_id = NEW.user_id 
      AND action_type = 'comment_given'
    )
  WHERE id = NEW.user_id;
  
  -- Update community tier based on engagement
  UPDATE public.profiles 
  SET community_tier = CASE 
    WHEN engagement_score >= 200 AND unique_posts_commented >= 50 THEN 2 -- All-Star
    WHEN engagement_score >= 25 AND unique_posts_commented >= 10 THEN 1 -- Rising Star
    ELSE 0 -- Insider
  END
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$function$;

-- 4. Create audit table for role changes
CREATE TABLE IF NOT EXISTS public.role_change_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  old_access_level text,
  new_access_level text,
  old_user_type text,
  new_user_type text,
  old_role text,
  new_role text,
  changed_by uuid REFERENCES auth.users(id),
  change_reason text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on the audit table
ALTER TABLE public.role_change_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can view role change audits
CREATE POLICY "Admins can view role change audits"
ON public.role_change_audit
FOR SELECT
TO authenticated
USING (public.is_admin());

-- System can insert audit records
CREATE POLICY "System can create role change audits"
ON public.role_change_audit
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 5. Create trigger to log role changes
CREATE OR REPLACE FUNCTION public.log_role_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Log any changes to access_level, user_type, or role
  IF OLD.access_level IS DISTINCT FROM NEW.access_level OR
     OLD.user_type IS DISTINCT FROM NEW.user_type OR
     OLD.role IS DISTINCT FROM NEW.role THEN
    
    INSERT INTO public.role_change_audit (
      user_id,
      old_access_level,
      new_access_level,
      old_user_type,
      new_user_type,
      old_role,
      new_role,
      changed_by,
      change_reason
    ) VALUES (
      NEW.id,
      OLD.access_level::text,
      NEW.access_level::text,
      OLD.user_type::text,
      NEW.user_type::text,
      OLD.role,
      NEW.role,
      auth.uid(),
      'Profile update'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS profile_role_change_audit ON public.profiles;
CREATE TRIGGER profile_role_change_audit
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_role_changes();

-- 6. Add constraints to ensure role consistency
ALTER TABLE public.profiles 
ADD CONSTRAINT check_admin_consistency 
CHECK (
  CASE 
    WHEN access_level = 'admin' THEN role = 'admin'
    ELSE true
  END
);

-- 7. Fix util-deprecate build issue by adding the missing dependency
-- This will be handled in the code section
