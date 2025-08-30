-- Production Parity Verification Script
-- Run this on both staging and production to ensure consistency

-- 1. Verify RLS is enabled on critical tables
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  'RLS should be enabled' as expected
FROM pg_tables pt
LEFT JOIN pg_class pc ON pc.relname = pt.tablename
WHERE schemaname = 'public'
  AND tablename IN ('account_requests', 'rate_limits', 'rate_limit_settings')
ORDER BY tablename;

-- 2. Check unique constraint on rate_limits table
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  confupdtype,
  confdeltype,
  'UNIQUE(identifier, limit_type)' as expected_constraint
FROM pg_constraint 
WHERE conrelid = 'public.rate_limits'::regclass
  AND contype = 'u';

-- 3. Verify rate_limit_settings table has the required row
SELECT 
  id,
  email_max_attempts,
  email_window_hours,
  ip_max_attempts,
  ip_window_hours,
  created_at,
  updated_at,
  'Should have id=1 with production values' as note
FROM public.rate_limit_settings
ORDER BY id;

-- 4. Check RLS policies on rate_limits table
SELECT 
  pol.polname as policy_name,
  pol.polcmd as command,
  pol.polpermissive as permissive,
  pg_get_expr(pol.polqual, pol.polrelid) as using_expression,
  pg_get_expr(pol.polwithcheck, pol.polrelid) as with_check_expression
FROM pg_policy pol
JOIN pg_class pc ON pol.polrelid = pc.oid
WHERE pc.relname = 'rate_limits'
ORDER BY pol.polname;

-- 5. Verify environment configuration (check these manually)
/*
Manual checks required:
1. SUPABASE_URL matches expected environment
2. SUPABASE_ANON_KEY is correctly configured
3. SUPABASE_SERVICE_ROLE_KEY is present in edge functions
4. rate_limit_settings row has correct values for environment:
   - Staging: email=5/day, ip=20/hour (testing)
   - Production: email=1/day, ip=10/hour (conservative launch)
*/

-- 6. Test edge function availability
/*
Run these HTTP tests manually or via script:

curl -X POST https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/account-request-rate-limit \
  -H "Authorization: Bearer [ANON_KEY]" \
  -H "Content-Type: application/json" \
  -d '{"identifier":"test@example.com","limitType":"email","consume":false}'

Expected: 200 response with rate limit data
*/

-- 7. Database function availability check
SELECT 
  routine_name,
  routine_type,
  'Should exist' as expected
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'check_account_request_rate_limit',
    'cleanup_old_rate_limits', 
    'has_role'
  )
ORDER BY routine_name;

-- 8. Check audit trail configuration
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  'Audit triggers should be present' as note
FROM information_schema.triggers
WHERE event_object_table = 'account_requests'
ORDER BY trigger_name;

-- Summary report
SELECT 
  'Production Parity Check' as check_type,
  NOW() as run_at,
  current_database() as database_name,
  current_user as run_by,
  version() as postgres_version;

-- Final verification query - should return expected counts
SELECT 
  'Verification Summary' as summary,
  (SELECT COUNT(*) FROM pg_policy WHERE polrelid = 'public.rate_limits'::regclass) as rate_limits_policies_count,
  (SELECT COUNT(*) FROM public.rate_limit_settings) as settings_rows_count,
  (SELECT rowsecurity FROM pg_tables WHERE tablename = 'rate_limits' AND schemaname = 'public') as rate_limits_rls_enabled,
  (SELECT COUNT(*) FROM pg_constraint WHERE conrelid = 'public.rate_limits'::regclass AND contype = 'u') as unique_constraints_count;