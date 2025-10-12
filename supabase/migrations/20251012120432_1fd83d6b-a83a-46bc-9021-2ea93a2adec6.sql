-- Null out incompatible BASE64 password hashes for legacy accounts
-- This allows these accounts to activate via password reset flow
UPDATE account_requests 
SET password_hash = NULL, 
    updated_at = NOW()
WHERE email IN ('jackmamaster11@gmail.com', 'vtemperortrix@gmail.com')
AND status = 'approved';

-- Add helpful comment for audit trail
COMMENT ON COLUMN account_requests.password_hash IS 'SHA-256 hex hash (64 chars). Null indicates password reset required.';