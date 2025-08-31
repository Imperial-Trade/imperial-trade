
-- 1) Create fixed-column settings table expected by the edge function
CREATE TABLE IF NOT EXISTS public.rate_limit_settings (
  id integer PRIMARY KEY DEFAULT 1,
  email_max_attempts integer NOT NULL DEFAULT 1,
  email_window_seconds integer NOT NULL DEFAULT 86400,
  ip_max_attempts integer NOT NULL DEFAULT 10,
  ip_window_seconds integer NOT NULL DEFAULT 3600,
  allowlist_cidrs text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Enable RLS and lock down access (admin-only). The service role used by the edge function bypasses RLS.
ALTER TABLE public.rate_limit_settings ENABLE ROW LEVEL SECURITY;

-- Remove any existing permissive/public policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Admins can manage rate limit settings" ON public.rate_limit_settings;
DROP POLICY IF EXISTS "System can read rate limit settings" ON public.rate_limit_settings;

-- Single admin policy for all operations; WITH CHECK ensures safe writes by admins
CREATE POLICY "Admins can manage rate limit settings"
  ON public.rate_limit_settings
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3) Keep updated_at fresh on updates (set_updated_at() already exists)
DROP TRIGGER IF EXISTS update_rate_limit_settings_updated_at ON public.rate_limit_settings;
CREATE TRIGGER update_rate_limit_settings_updated_at
  BEFORE UPDATE ON public.rate_limit_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 4) Seed defaults that match current production caps exactly (no behavior change)
INSERT INTO public.rate_limit_settings (
  id, email_max_attempts, email_window_seconds, ip_max_attempts, ip_window_seconds, allowlist_cidrs
) VALUES (
  1, 1, 86400, 10, 3600, '{}'
)
ON CONFLICT (id) DO NOTHING;
