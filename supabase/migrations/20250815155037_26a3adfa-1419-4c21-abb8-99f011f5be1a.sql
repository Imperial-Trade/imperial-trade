-- Create database triggers for automatic signal notifications

-- Trigger for when new signals are created (INSERT)
DROP TRIGGER IF EXISTS trigger_auto_notify_signal_creation ON public.trade_alerts;
CREATE TRIGGER trigger_auto_notify_signal_creation
  AFTER INSERT ON public.trade_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_notify_signal_creation();

-- Trigger for when signals are updated (status, TP hits, etc.)
DROP TRIGGER IF EXISTS trigger_auto_notify_signal_changes ON public.trade_alerts;
CREATE TRIGGER trigger_auto_notify_signal_changes
  AFTER UPDATE ON public.trade_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_notify_signal_changes();

-- Trigger for when price alerts are triggered (alert_monitoring becomes inactive)
DROP TRIGGER IF EXISTS trigger_auto_notify_price_alerts ON public.alert_monitoring;
CREATE TRIGGER trigger_auto_notify_price_alerts
  AFTER UPDATE ON public.alert_monitoring
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_notify_price_alerts();