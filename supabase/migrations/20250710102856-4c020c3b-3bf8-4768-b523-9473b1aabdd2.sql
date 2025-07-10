
-- First, create the enum types if they don't exist
DO $$ BEGIN
    CREATE TYPE public.user_type_enum AS ENUM ('member', 'educator', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.access_level_enum AS ENUM ('user', 'moderator', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.account_status_enum AS ENUM ('active', 'suspended', 'pending_verification', 'inactive');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.registration_source_enum AS ENUM ('direct', 'account_request', 'social', 'admin_created', 'invitation');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add missing columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS user_type public.user_type_enum DEFAULT 'member',
ADD COLUMN IF NOT EXISTS access_level public.access_level_enum DEFAULT 'user',
ADD COLUMN IF NOT EXISTS account_status public.account_status_enum DEFAULT 'active',
ADD COLUMN IF NOT EXISTS registration_source public.registration_source_enum DEFAULT 'direct',
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approved_by TEXT;

-- Update the handle_new_user function to properly set the new fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.profiles (id, display_name, role, user_type, access_level, account_status, registration_source, phone_number)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'display_name', new.email, 'Anonymous User'),
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

-- Update existing profiles to have proper default values
UPDATE public.profiles 
SET 
  user_type = COALESCE(user_type, 'member'::public.user_type_enum),
  access_level = CASE 
    WHEN role = 'admin' THEN 'admin'::public.access_level_enum
    WHEN role = 'educator' THEN 'moderator'::public.access_level_enum
    ELSE 'user'::public.access_level_enum
  END,
  account_status = COALESCE(account_status, 'active'::public.account_status_enum),
  registration_source = COALESCE(registration_source, 'direct'::public.registration_source_enum)
WHERE user_type IS NULL OR access_level IS NULL OR account_status IS NULL OR registration_source IS NULL;
