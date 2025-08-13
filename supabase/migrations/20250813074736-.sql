-- Harden realtime delivery for alerts
-- Ensure complete row images and publication membership for realtime

-- 1) Set REPLICA IDENTITY FULL for alert-related tables (safe if they exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'alert_monitoring'
  ) THEN
    EXECUTE 'ALTER TABLE public.alert_monitoring REPLICA IDENTITY FULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'trade_alerts'
  ) THEN
    EXECUTE 'ALTER TABLE public.trade_alerts REPLICA IDENTITY FULL';
  END IF;
END$$;

-- 2) Ensure both tables are in the supabase_realtime publication (idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'alert_monitoring'
    ) AND NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'alert_monitoring'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.alert_monitoring';
    END IF;

    IF EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'trade_alerts'
    ) AND NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'trade_alerts'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.trade_alerts';
    END IF;
  END IF;
END$$;