
-- Add 'educator' to the account_type enum
ALTER TYPE public.account_type ADD VALUE 'educator';

-- Update any existing records that have 'admin' account_type to maintain consistency
-- (This preserves existing data while making the enum more specific)
UPDATE public.account_requests 
SET account_type = 'educator'::public.account_type 
WHERE account_type = 'admin'::public.account_type;

-- Note: We keep 'admin' in the enum for backward compatibility but 
-- it should only be used for actual admin accounts, not educator requests
