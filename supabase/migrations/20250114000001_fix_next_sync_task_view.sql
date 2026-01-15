-- Fix next_sync_task view to only pick up pending connections
-- This ensures Go Brain only processes new connections that need initial setup

CREATE OR REPLACE VIEW next_sync_task AS
SELECT * FROM broker_connections
WHERE is_active = true 
  AND is_syncing = false
  AND connection_status = 'pending'  -- Only pick up pending connections
ORDER BY sync_priority ASC, last_sync_at ASC NULLS FIRST
LIMIT 30;

COMMENT ON VIEW next_sync_task IS 
'Returns broker connections that need initial processing (status = pending). Go Brain processes these to establish MT5 connections.';
