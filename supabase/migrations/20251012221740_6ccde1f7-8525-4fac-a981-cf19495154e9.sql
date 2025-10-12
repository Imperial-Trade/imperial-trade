-- Migration: Sync missing emails and fix handle_new_user trigger

-- Step 1: Sync emails from auth.users to profiles where email is null
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
  AND p.email IS NULL
  AND u.email IS NOT NULL;

-- Log the sync operation
INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
SELECT 
  'sync_missing_profile_emails', 
  NOW(), 
  COUNT(*),
  'success',
  'Synced missing emails from auth.users to profiles table'
FROM public.profiles 
WHERE email IS NOT NULL 
  AND id IN (SELECT id FROM auth.users WHERE email IS NOT NULL);

-- Step 2: Fix handle_new_user trigger to explicitly set email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = 'public'
AS $$
DECLARE 
  computed_role text; 
  computed_user_type user_type_enum; 
  computed_access_level access_level_enum;
BEGIN
  computed_role := CASE 
    WHEN NEW.raw_user_meta_data->>'access_level' = 'admin' THEN 'admin' 
    WHEN NEW.raw_user_meta_data->>'role' = 'admin' THEN 'admin' 
    WHEN NEW.raw_user_meta_data->>'role' = 'educator' THEN 'educator' 
    WHEN NEW.raw_user_meta_data->>'role' = 'user' THEN 'user' 
    ELSE 'user' 
  END;
  
  computed_user_type := CASE 
    WHEN NEW.raw_user_meta_data->>'user_type' = 'admin' THEN 'admin'::user_type_enum 
    WHEN NEW.raw_user_meta_data->>'user_type' = 'educator' THEN 'educator'::user_type_enum 
    WHEN NEW.raw_user_meta_data->>'account_type' = 'educator' THEN 'educator'::user_type_enum 
    WHEN NEW.raw_user_meta_data->>'account_type' = 'user' THEN 'user'::user_type_enum 
    ELSE 'user'::user_type_enum 
  END;
  
  computed_access_level := CASE 
    WHEN NEW.raw_user_meta_data->>'access_level' = 'admin' THEN 'admin'::access_level_enum 
    WHEN NEW.raw_user_meta_data->>'role' = 'admin' THEN 'admin'::access_level_enum 
    WHEN NEW.raw_user_meta_data->>'access_level' = 'moderator' THEN 'moderator'::access_level_enum 
    WHEN NEW.raw_user_meta_data->>'role' = 'educator' THEN 'moderator'::access_level_enum 
    WHEN NEW.raw_user_meta_data->>'account_type' = 'educator' THEN 'moderator'::access_level_enum 
    WHEN NEW.raw_user_meta_data->>'access_level' = 'user' THEN 'user'::access_level_enum 
    ELSE 'user'::access_level_enum 
  END;
  
  INSERT INTO public.profiles (
    id, 
    email,
    real_name, 
    display_name, 
    role, 
    user_type, 
    access_level, 
    account_status, 
    registration_source, 
    phone_number
  ) VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name', 
      NEW.raw_user_meta_data->>'name', 
      NEW.email, 
      'User'
    ), 
    NULL,
    computed_role, 
    computed_user_type, 
    computed_access_level, 
    COALESCE((NEW.raw_user_meta_data->>'account_status')::account_status_enum, 'active'::account_status_enum), 
    COALESCE((NEW.raw_user_meta_data->>'registration_source')::registration_source_enum, 'direct'::registration_source_enum), 
    NEW.raw_user_meta_data->>'phone_number'
  );
  
  RETURN NEW;
END;
$$;