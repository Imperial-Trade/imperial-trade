
  -- 1) RLS hardening for rate_limits
-- Ensure RLS is enabled (safe if already enabled)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Drop overly-permissive policy if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'rate_limits' 
      AND policyname = 'System can manage rate limits'
  ) THEN
    EXECUTE 'DROP POLICY "System can manage rate limits" ON public.rate_limits';
  END IF;
END$$;

-- Create admin-only read policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'rate_limits' 
      AND policyname = 'Admins can view rate limits'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can view rate limits"
      ON public.rate_limits
      FOR SELECT
      USING (has_role(auth.uid(), ''admin''::app_role))';
  END IF;
END$$;

-- No INSERT/UPDATE/DELETE policies are intentionally created.
-- Result: only service role (edge functions) can write (RLS bypass),
-- admins can read, and everyone else has no access.

--------------------------------------------------------------------
-- 2) De-duplicate and add uniqueness on (identifier, limit_type)
--------------------------------------------------------------------

-- Deduplicate rows by keeping the most recent per (identifier, limit_type)
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY identifier, limit_type
      ORDER BY window_start DESC, last_attempt DESC, created_at DESC, id DESC
    ) AS rn
  FROM public.rate_limits
)
DELETE FROM public.rate_limits rl
USING ranked r
WHERE rl.id = r.id
  AND r.rn > 1;

-- Drop non-unique index if it exists to replace with a unique index
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i'
      AND c.relname = 'idx_rate_limits_identifier_type'
      AND n.nspname = 'public'
  ) THEN
    EXECUTE 'DROP INDEX CONCURRENTLY IF EXISTS public.idx_rate_limits_identifier_type';
  END IF;
END$$;

-- Create a UNIQUE index concurrently (won't error if it already exists)
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uniq_rate_limits_identifier_type
  ON public.rate_limits (identifier, limit_type);

--------------------------------------------------------------------
-- 3) Server-side parameter store for rate limiting (single-row table)
--------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rate_limit_settings (
  id smallint PRIMARY KEY DEFAULT 1,                          -- single row key
  -- Current caps (no change yet)
  email_max_attempts integer NOT NULL DEFAULT 1,              -- 1/day
  email_window_seconds integer NOT NULL DEFAULT 86400,        -- 24h
  ip_max_attempts integer NOT NULL DEFAULT 10,                -- 10/hour (fixed window)
  ip_window_seconds integer NOT NULL DEFAULT 3600,            -- 1h
  -- Future caps (placeholders for planned tuning)
  ip_burst_per_10s integer NOT NULL DEFAULT 10,               -- allow short spikes
  ip_soft_hourly integer NOT NULL DEFAULT 60,                 -- soft limit/hour
  ip_hard_daily integer NOT NULL DEFAULT 600,                 -- hard limit/day
  per_email_min_interval_seconds integer NOT NULL DEFAULT 10, -- ≤1 submit every 10s
  cooldown_after_rejections integer NOT NULL DEFAULT 3,       -- rejected attempts before cooldown
  cooldown_seconds integer NOT NULL DEFAULT 900,              -- 15 minutes
  allowlist_cidrs text[] NOT NULL DEFAULT '{}',               -- office/VPN/test IPs
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed the single row if missing
INSERT INTO public.rate_limit_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS and restrict to admins only
ALTER TABLE public.rate_limit_settings ENABLE ROW LEVEL SECURITY;

-- Admins can view and update settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'rate_limit_settings' 
      AND policyname = 'Admins can manage rate limit settings'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can manage rate limit settings"
      ON public.rate_limit_settings
      FOR ALL
      USING (has_role(auth.uid(), ''admin''::app_role))
      WITH CHECK (has_role(auth.uid(), ''admin''::app_role))';
  END IF;
END$$;

-- No other policies → non-admins cannot read or write settings.

--------------------------------------------------------------------
-- 4) Notes (no-op SQL):
-- - Edge functions use the service role and will continue to work;
--   they bypass RLS, so locked-down policies won’t break them.
-- - Uniqueness enforcement prevents identifier/type duplication.
-- - Parameter table lets us tune caps without redeploys.
--------------------------------------------------------------------
  