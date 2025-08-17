-- Fix the notify_trade_alert_changes function to handle missing settings gracefully
CREATE OR REPLACE FUNCTION public.notify_trade_alert_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    notification_type text;
    priority_level text := 'normal';
    service_role_key text;
    function_url text;
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

    -- Use hardcoded values to avoid configuration parameter errors
    function_url := 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/enhanced-signal-notification-dispatcher';
    
    -- Try to get service role key, with fallback
    BEGIN
        service_role_key := current_setting('app.supabase_service_role_key', true);
    EXCEPTION WHEN OTHERS THEN
        service_role_key := NULL;
    END;
    
    -- Use fallback service role key if not found
    IF service_role_key IS NULL OR service_role_key = '' THEN
        service_role_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg2OTI1MCwiZXhwIjoyMDY3NDQ1MjUwfQ.0tHLp8yWK_lNP_6yrdNn4BqM3kGlWnKMcDf9fYMa2hU';
    END IF;

    -- Try to call the enhanced notification dispatcher, but don't fail the insert if it fails
    BEGIN
        PERFORM
            net.http_post(
                url := function_url,
                headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'Authorization', 'Bearer ' || service_role_key
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
            
        -- Log successful notification attempt
        INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
        VALUES (
            'notify_trade_alert_changes', 
            NOW(), 
            1, 
            'success',
            'Notification sent for signal: ' || NEW.asset_name || ' - Type: ' || notification_type
        );
        
    EXCEPTION WHEN OTHERS THEN
        -- Log the error but don't fail the insert
        INSERT INTO public.cron_job_logs (job_name, execution_time, records_affected, status, error_message)
        VALUES (
            'notify_trade_alert_changes', 
            NOW(), 
            0, 
            'error', 
            'Notification failed for signal ' || NEW.asset_name || ': ' || SQLERRM
        );
    END;

    RETURN NEW;
END;
$function$