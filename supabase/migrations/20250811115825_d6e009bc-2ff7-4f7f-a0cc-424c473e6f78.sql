-- 1) Create enum for priority if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_priority') THEN
    CREATE TYPE public.notification_priority AS ENUM ('low', 'medium', 'high');
  END IF;
END $$;

-- 2) Create user_notifications table
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'system',
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  priority public.notification_priority NOT NULL DEFAULT 'medium',
  link_url text NULL,
  source text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3) Enable RLS
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- 4) Policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_notifications' AND policyname = 'Users can view their own notifications'
  ) THEN
    CREATE POLICY "Users can view their own notifications"
    ON public.user_notifications
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_notifications' AND policyname = 'Users can mark their own notifications'
  ) THEN
    CREATE POLICY "Users can mark their own notifications"
    ON public.user_notifications
    FOR UPDATE
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_notifications' AND policyname = 'Users can delete their own notifications'
  ) THEN
    CREATE POLICY "Users can delete their own notifications"
    ON public.user_notifications
    FOR DELETE
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_notifications' AND policyname = 'Users can insert their own notifications'
  ) THEN
    CREATE POLICY "Users can insert their own notifications"
    ON public.user_notifications
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 5) Trigger to maintain updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_user_notifications_updated_at'
  ) THEN
    CREATE TRIGGER trg_user_notifications_updated_at
    BEFORE UPDATE ON public.user_notifications
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 6) Useful indexes
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON public.user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON public.user_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notifications_is_read ON public.user_notifications(is_read);

-- 7) Realtime publication
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    -- Ignore error if already added
    BEGIN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications';
    EXCEPTION WHEN duplicate_object THEN
      -- no-op
    END;
  END IF;
END $$;