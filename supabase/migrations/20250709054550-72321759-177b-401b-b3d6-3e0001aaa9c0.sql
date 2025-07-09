
-- Update johnmark_bodegas@yahoo.com user metadata to include admin access level
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"access_level": "admin", "role": "admin"}'::jsonb
WHERE email = 'johnmark_bodegas@yahoo.com';

-- Verify the update was successful
SELECT email, raw_user_meta_data 
FROM auth.users 
WHERE email = 'johnmark_bodegas@yahoo.com';
