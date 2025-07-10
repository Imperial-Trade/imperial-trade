
-- First, let's check if the columns exist and add them if missing
DO $$ 
BEGIN
    -- Add user_type column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'user_type') THEN
        ALTER TABLE public.profiles ADD COLUMN user_type text DEFAULT 'member';
    END IF;
    
    -- Add access_level column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'access_level') THEN
        ALTER TABLE public.profiles ADD COLUMN access_level text DEFAULT 'user';
    END IF;
    
    -- Add account_status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'account_status') THEN
        ALTER TABLE public.profiles ADD COLUMN account_status text DEFAULT 'active';
    END IF;
    
    -- Add last_login column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'last_login') THEN
        ALTER TABLE public.profiles ADD COLUMN last_login timestamp with time zone;
    END IF;
    
    -- Add phone_number column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone_number') THEN
        ALTER TABLE public.profiles ADD COLUMN phone_number text;
    END IF;
    
    -- Add registration_source column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'registration_source') THEN
        ALTER TABLE public.profiles ADD COLUMN registration_source text DEFAULT 'direct';
    END IF;
    
    -- Add approved_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'approved_at') THEN
        ALTER TABLE public.profiles ADD COLUMN approved_at timestamp with time zone;
    END IF;
    
    -- Add approved_by column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'approved_by') THEN
        ALTER TABLE public.profiles ADD COLUMN approved_by text;
    END IF;
END $$;

-- Create enums if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_type_enum') THEN
        CREATE TYPE public.user_type_enum AS ENUM ('member', 'educator', 'admin');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'access_level_enum') THEN
        CREATE TYPE public.access_level_enum AS ENUM ('user', 'moderator', 'admin');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_status_enum') THEN
        CREATE TYPE public.account_status_enum AS ENUM ('active', 'suspended', 'pending_verification', 'inactive');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'registration_source_enum') THEN
        CREATE TYPE public.registration_source_enum AS ENUM ('direct', 'account_request', 'social', 'admin_created', 'invitation');
    END IF;
END $$;

-- Convert columns to use enums (with safe conversion)
DO $$
BEGIN
    -- Convert user_type to enum
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'user_type' AND data_type = 'text') THEN
        ALTER TABLE public.profiles 
        ALTER COLUMN user_type TYPE public.user_type_enum USING 
        CASE 
            WHEN user_type = 'educator' THEN 'educator'::public.user_type_enum
            WHEN user_type = 'admin' THEN 'admin'::public.user_type_enum
            ELSE 'member'::public.user_type_enum
        END;
    END IF;
    
    -- Convert access_level to enum
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'access_level' AND data_type = 'text') THEN
        ALTER TABLE public.profiles 
        ALTER COLUMN access_level TYPE public.access_level_enum USING 
        CASE 
            WHEN access_level = 'admin' THEN 'admin'::public.access_level_enum
            WHEN access_level = 'moderator' THEN 'moderator'::public.access_level_enum
            ELSE 'user'::public.access_level_enum
        END;
    END IF;
    
    -- Convert account_status to enum
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'account_status' AND data_type = 'text') THEN
        ALTER TABLE public.profiles 
        ALTER COLUMN account_status TYPE public.account_status_enum USING 
        CASE 
            WHEN account_status = 'suspended' THEN 'suspended'::public.account_status_enum
            WHEN account_status = 'pending_verification' THEN 'pending_verification'::public.account_status_enum
            WHEN account_status = 'inactive' THEN 'inactive'::public.account_status_enum
            ELSE 'active'::public.account_status_enum
        END;
    END IF;
    
    -- Convert registration_source to enum
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'registration_source' AND data_type = 'text') THEN
        ALTER TABLE public.profiles 
        ALTER COLUMN registration_source TYPE public.registration_source_enum USING 
        CASE 
            WHEN registration_source = 'account_request' THEN 'account_request'::public.registration_source_enum
            WHEN registration_source = 'social' THEN 'social'::public.registration_source_enum
            WHEN registration_source = 'admin_created' THEN 'admin_created'::public.registration_source_enum
            WHEN registration_source = 'invitation' THEN 'invitation'::public.registration_source_enum
            ELSE 'direct'::public.registration_source_enum
        END;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_access_level ON public.profiles(access_level);
CREATE INDEX IF NOT EXISTS idx_profiles_account_status ON public.profiles(account_status);
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON public.profiles(user_type);

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

-- Update existing admin users if they exist
UPDATE public.profiles 
SET access_level = 'admin'::public.access_level_enum,
    user_type = 'admin'::public.user_type_enum,
    account_status = 'active'::public.account_status_enum
WHERE role = 'admin';
