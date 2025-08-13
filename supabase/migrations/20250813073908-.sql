-- Harden realtime for alert_monitoring: ensure REPLICA IDENTITY FULL and publication membership

-- Ensure table uses REPLICA IDENTITY FULL for complete row data on updates
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'alert_monitoring'
  ) THEN
    EXECUTE 'ALTER TABLE public.alert_monitoring REPLICA IDENTITY FULL';
  END IF;
END$$;

-- Ensure the table is part of the supabase_realtime publication
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'alert_monitoring'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.alert_monitoring';
    END IF;
  END IF;
END$$;