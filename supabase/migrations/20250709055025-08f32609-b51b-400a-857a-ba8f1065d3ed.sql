
-- Update johnmarkbodegas041095@gmail.com user metadata to include admin access level
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"access_level": "admin", "role": "admin"}'::jsonb
WHERE email = 'johnmarkbodegas041095@gmail.com';

-- Verify the update was successful
SELECT email, raw_user_meta_data 
FROM auth.users 
WHERE email = 'johnmarkbodegas041095@gmail.com';
