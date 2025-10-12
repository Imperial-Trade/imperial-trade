-- Reset nmgang0@gmail.com account request to pending for re-testing
UPDATE public.account_requests
SET 
  status = 'pending',
  rejection_reason = NULL,
  approved_by = NULL,
  updated_at = now()
WHERE email = 'nmgang0@gmail.com';