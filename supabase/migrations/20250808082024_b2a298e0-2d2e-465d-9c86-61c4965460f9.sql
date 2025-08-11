-- Ensure realtime delivers full row data for updates
ALTER TABLE public.trade_alerts REPLICA IDENTITY FULL;

-- Helpful indexes for monitoring queries
CREATE INDEX IF NOT EXISTS idx_trade_alerts_status ON public.trade_alerts (status);
CREATE INDEX IF NOT EXISTS idx_trade_alerts_symbol ON public.trade_alerts (tradermade_symbol);

-- Attach trigger to set activation timestamps when status flips to active
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_activation_timestamp_trigger'
  ) THEN
    CREATE TRIGGER set_activation_timestamp_trigger
    BEFORE UPDATE ON public.trade_alerts
    FOR EACH ROW
    EXECUTE FUNCTION public.set_activation_timestamp();
  END IF;
END$$;

-- Attach trigger to create monitoring entries on insert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'create_alert_monitoring_entries_trigger'
  ) THEN
    CREATE TRIGGER create_alert_monitoring_entries_trigger
    AFTER INSERT ON public.trade_alerts
    FOR EACH ROW
    EXECUTE FUNCTION public.create_alert_monitoring_entries();
  END IF;
END$$;

-- Attach trigger to deactivate monitoring entries when TPs hit or signal closes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'deactivate_alert_monitoring_trigger'
  ) THEN
    CREATE TRIGGER deactivate_alert_monitoring_trigger
    AFTER UPDATE ON public.trade_alerts
    FOR EACH ROW
    EXECUTE FUNCTION public.deactivate_alert_monitoring();
  END IF;
END$$;