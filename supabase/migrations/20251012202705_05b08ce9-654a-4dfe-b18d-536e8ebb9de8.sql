-- ============================================
-- Fix Account Activation 500 Error
-- Add comprehensive logging to handle_new_user() trigger
-- ============================================

-- Drop and recreate the function to clear any cache
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  computed_role text;
  computed_user_type user_type_enum;
  computed_access_level access_level_enum;
BEGIN
  -- Compute role (string field)
  computed_role := CASE 
    WHEN NEW.raw_user_meta_data->>'access_level' = 'admin' THEN 'admin'
    WHEN NEW.raw_user_meta_data->>'role' = 'admin' THEN 'admin'
    WHEN NEW.raw_user_meta_data->>'role' = 'educator' THEN 'educator'
    WHEN NEW.raw_user_meta_data->>'role' = 'user' THEN 'user'
    ELSE 'user'
  END;
  
  -- Compute user_type (enum: admin | educator | member)
  computed_user_type := CASE 
    WHEN NEW.raw_user_meta_data->>'user_type' = 'admin' THEN 'admin'::user_type_enum
    WHEN NEW.raw_user_meta_data->>'user_type' = 'educator' THEN 'educator'::user_type_enum
    WHEN NEW.raw_user_meta_data->>'account_type' = 'educator' THEN 'educator'::user_type_enum
    WHEN NEW.raw_user_meta_data->>'account_type' = 'member' THEN 'member'::user_type_enum
    ELSE 'member'::user_type_enum
  END;
  
  -- Compute access_level (enum: admin | moderator | user) - NEVER 'member'
  computed_access_level := CASE 
    WHEN NEW.raw_user_meta_data->>'access_level' = 'admin' THEN 'admin'::access_level_enum
    WHEN NEW.raw_user_meta_data->>'role' = 'admin' THEN 'admin'::access_level_enum
    WHEN NEW.raw_user_meta_data->>'access_level' = 'moderator' THEN 'moderator'::access_level_enum
    WHEN NEW.raw_user_meta_data->>'role' = 'educator' THEN 'moderator'::access_level_enum
    WHEN NEW.raw_user_meta_data->>'account_type' = 'educator' THEN 'moderator'::access_level_enum
    WHEN NEW.raw_user_meta_data->>'access_level' = 'user' THEN 'user'::access_level_enum
    -- CRITICAL: Explicitly handle 'member' to prevent it from being used in access_level
    WHEN NEW.raw_user_meta_data->>'access_level' = 'member' THEN 'user'::access_level_enum
    ELSE 'user'::access_level_enum
  END;
  
  -- Log incoming metadata for debugging
  INSERT INTO public.cron_job_logs (
    job_name, execution_time, records_affected, status, error_message
  ) VALUES (
    'handle_new_user_start',
    NOW(),
    1,
    'info',
    format('📥 Creating profile for %s - Metadata: account_type=%s, role=%s, access_level=%s', 
      NEW.email, 
      COALESCE(NEW.raw_user_meta_data->>'account_type', 'null'),
      COALESCE(NEW.raw_user_meta_data->>'role', 'null'),
      COALESCE(NEW.raw_user_meta_data->>'access_level', 'null'))
  );
  
  -- Log computed values
  INSERT INTO public.cron_job_logs (
    job_name, execution_time, records_affected, status, error_message
  ) VALUES (
    'handle_new_user_computed',
    NOW(),
    1,
    'info',
    format('🔍 Computed values - role: %s, user_type: %s, access_level: %s', 
      computed_role, computed_user_type::text, computed_access_level::text)
  );
  
  -- Insert the profile with computed values
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
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name', 
      NEW.raw_user_meta_data->>'name',
      NEW.email,
      'User'
    ),
    NULL,  -- Display name starts as null
    computed_role,
    computed_user_type,
    computed_access_level,  -- GUARANTEED to be 'user', 'moderator', or 'admin'
    COALESCE(
      (NEW.raw_user_meta_data->>'account_status')::account_status_enum, 
      'active'::account_status_enum
    ),
    COALESCE(
      (NEW.raw_user_meta_data->>'registration_source')::registration_source_enum, 
      'direct'::registration_source_enum
    ),
    NEW.raw_user_meta_data->>'phone_number'
  );
  
  -- Log successful profile creation
  INSERT INTO public.cron_job_logs (
    job_name, execution_time, records_affected, status, error_message
  ) VALUES (
    'handle_new_user_success',
    NOW(),
    1,
    'success',
    format('✅ Profile created for %s - ID: %s, role: %s, user_type: %s, access_level: %s', 
      NEW.email, NEW.id, computed_role, computed_user_type::text, computed_access_level::text)
  );
  
  RETURN NEW;
  
EXCEPTION WHEN OTHERS THEN
  -- Log any errors with full details
  INSERT INTO public.cron_job_logs (
    job_name, execution_time, records_affected, status, error_message
  ) VALUES (
    'handle_new_user_error',
    NOW(),
    0,
    'error',
    format('❌ Profile creation failed for %s - Error: %s - SQLSTATE: %s', 
      NEW.email, SQLERRM, SQLSTATE)
  );
  RAISE;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Verify assign_default_role trigger exists (should be from previous migration)
-- This ensures new profiles automatically get 'user' role in user_roles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_profile_insert_assign_role' 
    AND tgrelid = 'public.profiles'::regclass
  ) THEN
    RAISE NOTICE 'Creating on_profile_insert_assign_role trigger';
    CREATE TRIGGER on_profile_insert_assign_role
      AFTER INSERT ON public.profiles
      FOR EACH ROW
      EXECUTE FUNCTION public.assign_default_role();
  END IF;
END $$;