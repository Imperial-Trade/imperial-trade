-- Allow service_role (used by edge functions) to bypass RLS on profiles
-- This enables admin-user-management edge function to query all user profiles
CREATE POLICY "Service role can access all profiles"
  ON public.profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add index for better performance on admin queries
CREATE INDEX IF NOT EXISTS idx_profiles_access_level ON public.profiles(access_level);
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON public.profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_profiles_account_status ON public.profiles(account_status);