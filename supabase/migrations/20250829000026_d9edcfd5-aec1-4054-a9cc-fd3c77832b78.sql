
-- 1) Ensure close_reason enum has all required values (add idempotently)
DO $$
BEGIN
  -- all_tps_hit (should already exist; keep idempotent for safety)
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'close_reason' AND e.enumlabel = 'all_tps_hit'
  ) THEN
    ALTER TYPE public.close_reason ADD VALUE 'all_tps_hit';
  END IF;

  -- expired (needed for "cancelled" standardization -> closed + expired)
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'close_reason' AND e.enumlabel = 'expired'
  ) THEN
    ALTER TYPE public.close_reason ADD VALUE 'expired';
  END IF;
END
$$;

-- 2) Ensure trade_alerts triggers are attached (all idempotent)
-- 2.1 updated_at auto-update
DROP TRIGGER IF EXISTS update_trade_alerts_updated_at ON public.trade_alerts;
CREATE TRIGGER update_trade_alerts_updated_at
  BEFORE UPDATE ON public.trade_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 2.2 block parameter edits when active (except admins)
DROP TRIGGER IF EXISTS trigger_prevent_active_mods ON public.trade_alerts;
CREATE TRIGGER trigger_prevent_active_mods
  BEFORE UPDATE ON public.trade_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_active_trade_modifications();

-- 2.3 set activation timestamp when pending -> active
DROP TRIGGER IF EXISTS trigger_set_activation_timestamp ON public.trade_alerts;
CREATE TRIGGER trigger_set_activation_timestamp
  BEFORE UPDATE ON public.trade_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_activation_timestamp();

-- 2.4 create alert_monitoring entries on insert
DROP TRIGGER IF EXISTS trigger_create_alert_monitoring ON public.trade_alerts;
CREATE TRIGGER trigger_create_alert_monitoring
  AFTER INSERT ON public.trade_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.create_alert_monitoring_entries();

-- 2.5 deactivate monitoring when TP hits change or closed
DROP TRIGGER IF EXISTS trigger_deactivate_alert_monitoring ON public.trade_alerts;
CREATE TRIGGER trigger_deactivate_alert_monitoring
  AFTER UPDATE ON public.trade_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.deactivate_alert_monitoring();

-- 2.6 auto-notify significant signal changes (status changes, tp hits, manual close, etc.)
DROP TRIGGER IF EXISTS trigger_auto_notify_signal_changes ON public.trade_alerts;
CREATE TRIGGER trigger_auto_notify_signal_changes
  AFTER UPDATE ON public.trade_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_notify_signal_changes();

-- 3) Performance indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_trade_alerts_status ON public.trade_alerts (status);
CREATE INDEX IF NOT EXISTS idx_trade_alerts_symbol ON public.trade_alerts (tradermade_symbol);
CREATE INDEX IF NOT EXISTS idx_trade_alerts_pending_orders ON public.trade_alerts (status, trade_type, created_at);

-- 4) Real-time publication and replica identity (idempotent)
ALTER TABLE public.trade_alerts REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'trade_alerts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.trade_alerts;
  END IF;
END
$$;

-- 5) Profiles table drift fix (columns used by functions)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onesignal_player_id text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_preferences jsonb DEFAULT '{}'::jsonb;

-- (Optional) Helpful indexes for profiles lookups used by notifications (idempotent)
CREATE INDEX IF NOT EXISTS idx_profiles_onesignal_player_id ON public.profiles (onesignal_player_id);
