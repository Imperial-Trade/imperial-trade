-- Deduplicate rate_limits to prepare for unique constraint
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY identifier, limit_type ORDER BY last_attempt DESC, window_start DESC, created_at DESC) AS rn
  FROM public.rate_limits
)
DELETE FROM public.rate_limits rl
USING ranked r
WHERE rl.id = r.id
  AND r.rn > 1;

-- Create a unique index to enforce one row per (identifier, limit_type)
CREATE UNIQUE INDEX IF NOT EXISTS uq_rate_limits_identifier_limit_type
ON public.rate_limits (identifier, limit_type);