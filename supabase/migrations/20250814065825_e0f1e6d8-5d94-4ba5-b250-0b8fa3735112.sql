-- Add the missing database trigger to call the function
CREATE TRIGGER auto_notify_signal_trigger 
AFTER INSERT ON public.trade_alerts 
FOR EACH ROW 
EXECUTE FUNCTION public.auto_notify_signal_creation();