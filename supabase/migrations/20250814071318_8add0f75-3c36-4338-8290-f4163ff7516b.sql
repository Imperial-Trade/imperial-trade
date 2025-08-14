-- Add missing trigger for automatic signal notifications
CREATE OR REPLACE TRIGGER trigger_auto_notify_signal_creation
  AFTER INSERT ON public.trade_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_notify_signal_creation();