
-- Add missing fields to profiles table for enhanced user management
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS user_type text DEFAULT 'member',
ADD COLUMN IF NOT EXISTS access_level text DEFAULT 'user',
ADD COLUMN IF NOT EXISTS account_status text DEFAULT 'active',
ADD COLUMN IF NOT EXISTS last_login timestamp with time zone,
ADD COLUMN IF NOT EXISTS phone_number text,
ADD COLUMN IF NOT EXISTS registration_source text DEFAULT 'direct',
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS approved_by text;

-- Create enums for better data consistency
CREATE TYPE public.user_type_enum AS ENUM ('member', 'educator', 'admin');
CREATE TYPE public.access_level_enum AS ENUM ('user', 'moderator', 'admin');
CREATE TYPE public.account_status_enum AS ENUM ('active', 'suspended', 'pending_verification', 'inactive');
CREATE TYPE public.registration_source_enum AS ENUM ('direct', 'account_request', 'social', 'admin_created', 'invitation');

-- Update profiles table to use enums (this will convert existing data)
ALTER TABLE public.profiles 
ALTER COLUMN user_type TYPE public.user_type_enum USING user_type::public.user_type_enum,
ALTER COLUMN access_level TYPE public.access_level_enum USING access_level::public.access_level_enum,
ALTER COLUMN account_status TYPE public.account_status_enum USING account_status::public.account_status_enum,
ALTER COLUMN registration_source TYPE public.registration_source_enum USING registration_source::public.registration_source_enum;

-- Update the handle_new_user function to set better defaults
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
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
    COALESCE(new.raw_user_meta_data->>'full_name', new.email, 'Anonymous User'),
    CASE 
      WHEN new.raw_user_meta_data->>'access_level' = 'admin' THEN 'admin'
      WHEN new.raw_user_meta_data->>'role' = 'admin' THEN 'admin'
      WHEN new.raw_user_meta_data->>'role' = 'educator' THEN 'educator'
      ELSE 'user'
    END,
    CASE 
      WHEN new.raw_user_meta_data->>'role' = 'educator' THEN 'educator'::public.user_type_enum
      WHEN new.raw_user_meta_data->>'access_level' = 'admin' THEN 'admin'::public.user_type_enum
      ELSE 'member'::public.user_type_enum
    END,
    CASE 
      WHEN new.raw_user_meta_data->>'access_level' = 'admin' THEN 'admin'::public.access_level_enum
      WHEN new.raw_user_meta_data->>'role' = 'admin' THEN 'admin'::public.access_level_enum
      ELSE 'user'::public.access_level_enum
    END,
    'active'::public.account_status_enum,
    CASE 
      WHEN new.raw_user_meta_data->>'registration_source' IS NOT NULL 
      THEN new.raw_user_meta_data->>'registration_source'::public.registration_source_enum
      ELSE 'direct'::public.registration_source_enum
    END,
    new.raw_user_meta_data->>'phone_number'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create index for better performance on admin queries
CREATE INDEX IF NOT EXISTS idx_profiles_access_level ON public.profiles(access_level);
CREATE INDEX IF NOT EXISTS idx_profiles_account_status ON public.profiles(account_status);
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON public.profiles(user_type);

-- Update existing admin user if exists
UPDATE public.profiles 
SET access_level = 'admin'::public.access_level_enum,
    user_type = 'admin'::public.user_type_enum,
    account_status = 'active'::public.account_status_enum
WHERE role = 'admin';
