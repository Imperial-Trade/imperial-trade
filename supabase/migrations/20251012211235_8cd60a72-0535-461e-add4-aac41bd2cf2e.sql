-- Temporary data fix: Reset account request for re-testing activation
-- This will allow re-testing the new profile creation logic in the edge function

UPDATE account_requests 
SET status = 'pending', 
    updated_at = now()
WHERE email = 'nmgang0@gmail.com';

-- Verify the reset
SELECT id, email, status, updated_at 
FROM account_requests 
WHERE email = 'nmgang0@gmail.com';