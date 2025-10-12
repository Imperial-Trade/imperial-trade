-- Drop the problematic trigger that's causing the access_level enum error
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Verify trigger is removed
SELECT tgname, tgrelid::regclass as table_name
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';