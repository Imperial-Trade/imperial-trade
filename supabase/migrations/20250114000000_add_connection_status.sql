-- Add connection_status field to broker_connections table
-- This allows frontend to see status: pending, connecting, connected, failed

ALTER TABLE public.broker_connections 
ADD COLUMN IF NOT EXISTS connection_status TEXT DEFAULT 'pending'
CHECK (connection_status IN ('pending', 'connecting', 'connected', 'failed'));

-- Set existing rows to 'connected' if they have last_sync_at, otherwise 'pending'
UPDATE public.broker_connections
SET connection_status = CASE
  WHEN last_sync_at IS NOT NULL THEN 'connected'
  WHEN last_error IS NOT NULL THEN 'failed'
  ELSE 'pending'
END
WHERE connection_status IS NULL OR connection_status = 'pending';

-- Add index for faster queries by status
CREATE INDEX IF NOT EXISTS idx_broker_connections_status 
ON public.broker_connections(connection_status) 
WHERE is_active = true;

COMMENT ON COLUMN public.broker_connections.connection_status IS 
'Connection status: pending (waiting for Go Brain), connecting (Go Brain processing), connected (success), failed (error)';
