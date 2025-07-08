
-- Update admin user metadata to include admin access level
-- Replace 'admin@tradeimperial.com' with your actual admin email if different
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"access_level": "admin", "role": "admin"}'::jsonb
WHERE email = 'admin@tradeimperial.com';

-- Verify the update was successful
SELECT email, raw_user_meta_data 
FROM auth.users 
WHERE email = 'admin@tradeimperial.com';
