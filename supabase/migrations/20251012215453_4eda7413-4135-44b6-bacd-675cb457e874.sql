-- =============================================
-- MANUAL FIX: Create missing profile for nmgang0@gmail.com
-- =============================================
-- This migration creates the missing profile for the existing auth user
-- who was approved but their profile was never created due to the bug.

-- Create missing profile for existing auth user
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
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'full_name', ar.full_name, 'User'),
  NULL,
  'user',
  'user'::user_type_enum,
  'user'::access_level_enum,
  'active'::account_status_enum,
  'account_request'::registration_source_enum,
  ar.phone_number
FROM auth.users au
JOIN account_requests ar ON ar.email = au.email
WHERE au.email = 'nmgang0@gmail.com'
  AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = au.id);

-- Log the fix
INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
VALUES (
  'manual_profile_fix',
  NOW(),
  1,
  'success',
  'Created missing profile for nmgang0@gmail.com via migration'
);