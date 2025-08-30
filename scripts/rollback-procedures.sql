-- Emergency Rollback Procedures for Rate Limiting System
-- Time each operation and document results

-- =============================================================================
-- ROLLBACK OPTION 1: Disable Rate Limiting (Emergency - Fastest)
-- =============================================================================

-- Step 1A: Disable RLS on rate_limits table (IMMEDIATE EFFECT)
-- Time this operation:
\timing on
ALTER TABLE public.rate_limits DISABLE ROW LEVEL SECURITY;
\timing off
-- Expected time: < 100ms

-- Step 1B: Set rate limits to maximum values (IMMEDIATE EFFECT)
-- Time this operation:
\timing on
UPDATE public.rate_limit_settings 
SET 
  email_max_attempts = 999999,
  ip_max_attempts = 999999,
  updated_at = NOW()
WHERE id = 1;
\timing off
-- Expected time: < 50ms

-- Verification: Check if rate limiting is effectively disabled
SELECT 
  'Rate Limiting Status' as check,
  email_max_attempts,
  ip_max_attempts,
  (SELECT rowsecurity FROM pg_tables WHERE tablename = 'rate_limits') as rls_enabled
FROM public.rate_limit_settings WHERE id = 1;

-- =============================================================================
-- ROLLBACK OPTION 2: Revert to Previous Settings
-- =============================================================================

-- Step 2A: Restore previous rate limit values
-- (Adjust values based on what was working before)
\timing on
UPDATE public.rate_limit_settings 
SET 
  email_max_attempts = 5,  -- Previous value
  email_window_hours = 24,
  ip_max_attempts = 20,    -- Previous value  
  ip_window_hours = 1,
  updated_at = NOW()
WHERE id = 1;
\timing off
-- Expected time: < 50ms

-- Step 2B: Clear rate limit data (fresh start)
\timing on
DELETE FROM public.rate_limits WHERE window_start < NOW() - INTERVAL '1 hour';
\timing off
-- Expected time: < 500ms depending on data volume

-- =============================================================================
-- ROLLBACK OPTION 3: Remove Unique Constraint (If Causing Issues)
-- =============================================================================

-- Step 3A: Drop unique constraint on rate_limits
\timing on
ALTER TABLE public.rate_limits 
DROP CONSTRAINT IF EXISTS rate_limits_identifier_limit_type_key CASCADE;
\timing off
-- Expected time: < 200ms

-- Step 3B: Recreate constraint with different name if needed
\timing on
ALTER TABLE public.rate_limits 
ADD CONSTRAINT rate_limits_unique_identifier_type 
UNIQUE (identifier, limit_type);
\timing off
-- Expected time: < 300ms + time to validate existing data

-- =============================================================================
-- ROLLBACK OPTION 4: Complete System Bypass (Last Resort)
-- =============================================================================

-- Step 4A: Rename rate_limit_settings table to disable edge function
\timing on
ALTER TABLE public.rate_limit_settings RENAME TO rate_limit_settings_disabled;
\timing off
-- Expected time: < 100ms
-- Effect: Edge function will fail gracefully and allow all requests

-- Step 4B: Create temporary bypass table (if needed to restore function)
\timing on
CREATE TABLE public.rate_limit_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  email_max_attempts INTEGER DEFAULT 999999,
  email_window_hours INTEGER DEFAULT 24,
  ip_max_attempts INTEGER DEFAULT 999999, 
  ip_window_hours INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.rate_limit_settings DEFAULT VALUES;
\timing off
-- Expected time: < 200ms

-- =============================================================================
-- RESTORE PROCEDURES (After Issue Resolution)
-- =============================================================================

-- Restore Option 1: Re-enable RLS
\timing on
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
\timing off

-- Restore Option 2: Restore production rate limits
\timing on
UPDATE public.rate_limit_settings 
SET 
  email_max_attempts = 1,  -- Production launch value
  ip_max_attempts = 10,    -- Production launch value
  updated_at = NOW()
WHERE id = 1;
\timing off

-- Restore Option 3: Restore original table name
\timing on
DROP TABLE IF EXISTS public.rate_limit_settings;
ALTER TABLE public.rate_limit_settings_disabled RENAME TO rate_limit_settings;
\timing off

-- =============================================================================
-- VERIFICATION QUERIES (Run After Any Rollback)
-- =============================================================================

-- Check current rate limiting status
SELECT 
  'Current Config' as status,
  email_max_attempts,
  ip_max_attempts,
  (SELECT rowsecurity FROM pg_tables WHERE tablename = 'rate_limits') as rls_enabled,
  (SELECT COUNT(*) FROM public.rate_limits) as active_rate_limits
FROM public.rate_limit_settings WHERE id = 1;

-- Test edge function response (run via HTTP client)
/*
curl -X POST https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/account-request-rate-limit \
  -H "Authorization: Bearer [ANON_KEY]" \
  -H "Content-Type: application/json" \
  -d '{"identifier":"rollback-test@example.com","limitType":"email","consume":false}'

Expected response after rollback:
- Option 1/4: {"allowed": true, "attemptsRemaining": 999999}
- Option 2: {"allowed": true, "attemptsRemaining": 5}
- Option 3: Should work normally
*/

-- =============================================================================
-- ROLLBACK TIMING LOG TEMPLATE
-- =============================================================================

/*
ROLLBACK EXECUTION LOG - [DATE/TIME]
====================================
Issue: [Brief description]
Rollback Option Used: [1/2/3/4]
Environment: [staging/production]

Step 1: [Action] - Time: [duration] - Status: [success/fail]
Step 2: [Action] - Time: [duration] - Status: [success/fail]
Step 3: [Action] - Time: [duration] - Status: [success/fail]

Total Rollback Time: [total duration]
Service Impact: [description]
Verification: [passed/failed - details]

Next Steps:
- [ ] Monitor edge function logs
- [ ] Monitor application errors
- [ ] Plan fix and re-deployment
- [ ] Update incident documentation

Executed by: [name]
Reviewed by: [name]
*/

-- =============================================================================
-- EMERGENCY CONTACT SCRIPT
-- =============================================================================

/*
If rollback fails or causes additional issues:

1. Check Supabase Dashboard:
   - https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/functions
   - https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/editor

2. Edge Function Logs:
   - https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/functions/account-request-rate-limit/logs

3. Database Health:
   - https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/reports/database

4. Alternative: Disable edge function entirely:
   - Comment out edge function code
   - Deploy empty function that returns {"allowed": true}
   - Restore client-side rate limiting temporarily
*/