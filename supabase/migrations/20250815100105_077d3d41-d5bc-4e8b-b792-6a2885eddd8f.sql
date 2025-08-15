-- Create triggers for automatic signal notifications using OneSignal native prompts

-- Create trigger to auto-notify on trade_alerts INSERT (signal creation)
CREATE OR REPLACE TRIGGER after_trade_alert_insert
  AFTER INSERT ON public.trade_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_notify_signal_creation();

-- Create trigger to auto-notify on trade_alerts UPDATE (signal updates)  
CREATE OR REPLACE TRIGGER after_trade_alert_update
  AFTER UPDATE ON public.trade_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_notify_signal_changes();

-- Create trigger to auto-notify when price alerts are triggered
CREATE OR REPLACE TRIGGER after_alert_monitoring_update
  AFTER UPDATE ON public.alert_monitoring
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_notify_price_alerts();

-- Update OneSignal SDK configuration to use enhanced native slidedown
UPDATE public.profiles 
SET push_subscription_active = false,
    onesignal_subscription_status = 'unsubscribed'
WHERE push_subscription_active = true 
  AND onesignal_player_id IS NULL;

-- Clean up any inconsistent states
UPDATE public.profiles 
SET push_subscription_active = true,
    onesignal_subscription_status = 'subscribed'
WHERE onesignal_player_id IS NOT NULL 
  AND push_subscription_active = false;