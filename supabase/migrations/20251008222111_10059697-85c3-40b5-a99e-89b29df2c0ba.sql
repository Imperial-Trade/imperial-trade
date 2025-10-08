-- Add new fields to account_requests table for simplified signup flow
ALTER TABLE public.account_requests 
  ADD COLUMN IF NOT EXISTS password_hash text,
  ADD COLUMN IF NOT EXISTS terms_accepted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS social_provider text,
  ADD COLUMN IF NOT EXISTS social_id text;

-- Make optional fields nullable (if not already)
ALTER TABLE public.account_requests 
  ALTER COLUMN phone_number DROP NOT NULL,
  ALTER COLUMN vt_market_account_number DROP NOT NULL,
  ALTER COLUMN reason DROP NOT NULL,
  ALTER COLUMN referrer DROP NOT NULL;

-- Set default for account_type
ALTER TABLE public.account_requests 
  ALTER COLUMN account_type SET DEFAULT 'user';

-- Add index for social provider lookups
CREATE INDEX IF NOT EXISTS idx_account_requests_social_id ON public.account_requests(social_id) WHERE social_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.account_requests.password_hash IS 'Bcrypt hashed password for email/password signups';
COMMENT ON COLUMN public.account_requests.social_provider IS 'OAuth provider (facebook, google, etc.)';
COMMENT ON COLUMN public.account_requests.social_id IS 'Unique ID from OAuth provider';