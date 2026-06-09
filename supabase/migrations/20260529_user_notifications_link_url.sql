-- Add link_url for room-scoped notification deep links (Insight chat).
ALTER TABLE public.user_notifications
  ADD COLUMN IF NOT EXISTS link_url text;

COMMENT ON COLUMN public.user_notifications.link_url IS
  'In-app navigation target (e.g. Insight room chat).';
