-- Create database triggers for automatic signal notification dispatch

-- 1. Create function to dispatch notifications for trade alerts
CREATE OR REPLACE FUNCTION notify_trade_alert_changes()
RETURNS TRIGGER AS $$
DECLARE
    notification_type text;
    priority_level text := 'normal';
BEGIN
    -- Determine notification type based on the operation and status changes
    IF TG_OP = 'INSERT' THEN
        notification_type := 'signal_created';
        priority_level := 'high';
    ELSIF TG_OP = 'UPDATE' THEN
        -- Check what changed to determine notification type
        IF OLD.status != NEW.status THEN
            CASE NEW.status
                WHEN 'active' THEN 
                    notification_type := 'signal_activated';
                    priority_level := 'high';
                WHEN 'closed' THEN 
                    notification_type := 'signal_closed';
                    priority_level := 'normal';
                ELSE 
                    notification_type := 'signal_updated';
                    priority_level := 'normal';
            END CASE;
        ELSIF OLD.tp_hits != NEW.tp_hits THEN
            notification_type := 'signal_tp_hit';
            priority_level := 'high';
        ELSE
            notification_type := 'signal_updated';
            priority_level := 'normal';
        END IF;
    ELSE
        RETURN NULL; -- Don't process DELETE operations
    END IF;

    -- Call the enhanced notification dispatcher
    PERFORM
        net.http_post(
            url := current_setting('app.supabase_url') || '/functions/v1/enhanced-signal-notification-dispatcher',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
            ),
            body := jsonb_build_object(
                'notifications', jsonb_build_array(
                    jsonb_build_object(
                        'signal_id', NEW.id,
                        'notification_type', notification_type,
                        'priority_level', priority_level,
                        'asset_name', NEW.asset_name,
                        'trade_type', NEW.trade_type,
                        'entry_price', NEW.entry_price,
                        'status', NEW.status,
                        'tp_hits', NEW.tp_hits,
                        'created_by', NEW.user_id,
                        'include_creator', false,
                        'delivery_channels', jsonb_build_array('push', 'in_app')
                    )
                )
            )
        );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create triggers for trade_alerts table
DROP TRIGGER IF EXISTS trade_alert_notification_trigger ON trade_alerts;
CREATE TRIGGER trade_alert_notification_trigger
    AFTER INSERT OR UPDATE ON trade_alerts
    FOR EACH ROW
    EXECUTE FUNCTION notify_trade_alert_changes();

-- 3. Enable Row Level Security check bypass for the notification function
-- Grant necessary permissions for the trigger function
GRANT USAGE ON SCHEMA net TO postgres;
GRANT EXECUTE ON FUNCTION net.http_post TO postgres;