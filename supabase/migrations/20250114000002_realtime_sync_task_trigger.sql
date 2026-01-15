-- Realtime Sync Task Notification Trigger (Final Level Optimization)
-- This trigger notifies Go Brain instantly when a priority sync task is created
-- Moves from "checking for work" to "being told there is work" - <100ms response time

-- 1. Create the function that sends the notification
CREATE OR REPLACE FUNCTION notify_vps_sync_task()
RETURNS TRIGGER AS $$
BEGIN
    -- Only notify if it is a priority sync (sync_priority = 1)
    -- This avoids waking up the VPS for routine background syncs
    IF NEW.sync_priority = 1 THEN
        PERFORM pg_notify('sync_task_created', NEW.id::text);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Create the trigger on the broker_connections table
DROP TRIGGER IF EXISTS sync_task_notify ON broker_connections;
CREATE TRIGGER sync_task_notify
    AFTER INSERT OR UPDATE OF sync_priority ON broker_connections
    FOR EACH ROW
    EXECUTE FUNCTION notify_vps_sync_task();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION notify_sync_task() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_sync_task() TO service_role;

COMMENT ON FUNCTION notify_sync_task() IS 'Notifies Go Brain via LISTEN/NOTIFY when a new sync task is created (sync_priority=1, status=pending)';
