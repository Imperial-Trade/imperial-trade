-- Fix security warning for the newly created trigger function
ALTER FUNCTION public.notify_trade_alert_changes() SET search_path = 'public';