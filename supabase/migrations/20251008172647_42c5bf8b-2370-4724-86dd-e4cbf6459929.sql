-- Phase 1: Add 'user' role to all existing users who don't have it
-- This ensures all authenticated users have the base 'user' role for dashboard access

INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT u.id, 'user'::app_role
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id AND ur.role = 'user'::app_role
WHERE ur.id IS NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Verify the fix: All users should now have at least the 'user' role
-- You can run this query to verify:
-- SELECT u.email, ARRAY_AGG(ur.role) as roles
-- FROM auth.users u
-- LEFT JOIN public.user_roles ur ON u.id = ur.user_id
-- GROUP BY u.id, u.email
-- ORDER BY u.created_at DESC;