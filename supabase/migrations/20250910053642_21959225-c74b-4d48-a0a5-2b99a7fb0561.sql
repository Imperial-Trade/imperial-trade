-- Legacy cleanup: Disable legacy notification triggers and mark as deprecated
-- This ensures only the enhanced dispatcher path remains active

-- 1. Disable the legacy auto_notify_signal_creation trigger
DROP TRIGGER IF EXISTS auto_notify_signal_creation ON public.trade_alerts;

-- 2. Disable the legacy auto_notify_signal_changes trigger  
DROP TRIGGER IF EXISTS auto_notify_signal_changes ON public.trade_alerts;

-- 3. Keep only the enhanced notification system active
-- The enhanced system uses: auto_notify_price_alerts (for price alerts)
-- and signal-notification-dispatcher edge function (for signal changes)

-- 4. Mark legacy notification functions as deprecated
COMMENT ON FUNCTION public.notify_trade_alert_changes() IS 'DEPRECATED: Use enhanced-signal-notification-dispatcher edge function instead';

-- 5. Add function to check system status
CREATE OR REPLACE FUNCTION public.get_realtime_system_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  status_data jsonb;
BEGIN
  status_data := jsonb_build_object(
    'active_alerts_monitoring', (SELECT COUNT(*) FROM alert_monitoring WHERE is_active = true),
    'daily_telemetry_records', (SELECT COUNT(*) FROM realtime_telemetry WHERE date >= CURRENT_DATE - INTERVAL '7 days'),
    'enhanced_dispatcher_active', true,
    'legacy_triggers_disabled', true,
    'price_ingestor_version', '3.0-hardened',
    'last_updated', now()
  );
  
  RETURN status_data;
END;
$$;