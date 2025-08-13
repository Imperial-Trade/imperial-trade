-- Deduplicate and add uniqueness to rate limit identifiers and account request emails
BEGIN;

-- 1) Deduplicate rate_limits on (identifier, limit_type)
WITH dedup AS (
  SELECT identifier, limit_type, MIN(id) AS keep_id
  FROM public.rate_limits
  GROUP BY identifier, limit_type
)
DELETE FROM public.rate_limits rl
USING dedup d
WHERE rl.identifier = d.identifier
  AND rl.limit_type = d.limit_type
  AND rl.id <> d.keep_id;

-- 2) Add unique constraint for rate_limits (identifier, limit_type)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rate_limits_unique_identifier_type'
  ) THEN
    ALTER TABLE public.rate_limits
    ADD CONSTRAINT rate_limits_unique_identifier_type UNIQUE (identifier, limit_type);
  END IF;
END $$;

-- 3) Deduplicate account_requests by lower(email), keep the most recent
WITH ranked AS (
  SELECT id, email, created_at,
         ROW_NUMBER() OVER (PARTITION BY lower(email) ORDER BY created_at DESC, id DESC) AS rn
  FROM public.account_requests
)
DELETE FROM public.account_requests ar
USING ranked r
WHERE ar.id = r.id AND r.rn > 1;

-- 4) Create unique index on lower(email) for account_requests
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'account_requests_email_unique'
  ) THEN
    CREATE UNIQUE INDEX account_requests_email_unique ON public.account_requests (lower(email));
  END IF;
END $$;

COMMIT;