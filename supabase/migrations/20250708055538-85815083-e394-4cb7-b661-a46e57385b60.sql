
-- Add new columns to the account_requests table
ALTER TABLE public.account_requests 
ADD COLUMN phone_number TEXT,
ADD COLUMN vt_market_account_number TEXT,
ADD COLUMN referrer TEXT;

-- Update the existing email column to be more descriptive (optional, but helps with clarity)
COMMENT ON COLUMN public.account_requests.email IS 'VT Market Email address';
