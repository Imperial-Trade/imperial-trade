
-- 1) Create admin_notification_events table
CREATE TABLE public.admin_notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL, -- e.g. 'new_request' | 'resubmission' | 'approval' | 'rejection' | 'daily_digest' | 'test'
  channels TEXT[] NOT NULL DEFAULT '{}'::text[], -- e.g. '{email,push}'
  subject TEXT,
  message TEXT NOT NULL,
  recipients JSONB NOT NULL, -- e.g. { "emails": [...], "user_ids": [...], "segments": [...] }
  delivery_status TEXT NOT NULL DEFAULT 'sent', -- 'sent' | 'failed' | 'partial'
  error TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb, -- anything helpful (account_request_id, counts, payload refs)
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) Indexes for faster admin UI queries
CREATE INDEX admin_notification_events_sent_at_idx ON public.admin_notification_events (sent_at DESC);
CREATE INDEX admin_notification_events_event_type_idx ON public.admin_notification_events (event_type);
CREATE INDEX admin_notification_events_delivery_status_idx ON public.admin_notification_events (delivery_status);

-- 3) Updated_at trigger (uses existing helper)
CREATE TRIGGER trg_admin_notification_events_updated_at
BEFORE UPDATE ON public.admin_notification_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Enable RLS
ALTER TABLE public.admin_notification_events ENABLE ROW LEVEL SECURITY;

-- 5) RLS policies
-- Admins can read all events
CREATE POLICY "Admins can view admin notification events"
  ON public.admin_notification_events
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- System (edge functions) can insert logs
CREATE POLICY "System can insert admin notification events"
  ON public.admin_notification_events
  FOR INSERT
  WITH CHECK (true);

-- Optional: Prevent updates/deletes by clients (no policy => blocked)

