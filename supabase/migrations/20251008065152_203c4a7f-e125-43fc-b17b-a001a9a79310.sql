-- Add email column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Create function to sync email from auth.users to profiles
CREATE OR REPLACE FUNCTION public.sync_user_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles 
  SET email = NEW.email 
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

-- Create trigger to automatically sync email on user creation/update
DROP TRIGGER IF EXISTS sync_email_to_profile ON auth.users;
CREATE TRIGGER sync_email_to_profile
  AFTER INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_email();

-- Backfill existing user emails from auth.users
UPDATE public.profiles p 
SET email = (SELECT email FROM auth.users WHERE id = p.id)
WHERE p.email IS NULL;