-- ============================================
-- Fix missing email for jackmamaster11@gmail.com
-- ============================================

-- Update the profile with the missing email
UPDATE public.profiles
SET email = 'jackmamaster11@gmail.com',
    updated_at = NOW()
WHERE id = '9b5003a4-4848-42bd-b111-97aaaf6dff4c'
  AND email IS NULL;

-- Log the fix for audit trail
INSERT INTO public.cron_job_logs (
  job_name, 
  execution_time, 
  records_affected, 
  status, 
  error_message
)
VALUES (
  'fix_missing_email_jackmamaster11', 
  NOW(), 
  1, 
  'success',
  'Fixed missing email for jackmamaster11@gmail.com (user_id: 9b5003a4-4848-42bd-b111-97aaaf6dff4c)'
);

-- Verify the fix
DO $$
DECLARE
  profile_record RECORD;
BEGIN
  SELECT 
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
  INTO profile_record
  FROM public.profiles
  WHERE id = '9b5003a4-4848-42bd-b111-97aaaf6dff4c';

  -- Log verification
  INSERT INTO public.cron_job_logs (
    job_name, 
    execution_time, 
    records_affected, 
    status, 
    error_message
  )
  VALUES (
    'verify_jackmamaster11_profile', 
    NOW(), 
    1, 
    'success',
    format(
      'Profile verified - Email: %s, Name: %s, Role: %s, Type: %s, Access: %s, Status: %s',
      profile_record.email,
      profile_record.real_name,
      profile_record.role,
      profile_record.user_type,
      profile_record.access_level,
      profile_record.account_status
    )
  );
END $$;