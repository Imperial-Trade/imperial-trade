
-- Add unified legal acceptance fields to account_requests
ALTER TABLE public.account_requests
ADD COLUMN IF NOT EXISTS legal_accepted boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS legal_accepted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS legal_version text;

-- Add unified legal acceptance fields to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS legal_accepted boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS legal_accepted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS legal_version text;
