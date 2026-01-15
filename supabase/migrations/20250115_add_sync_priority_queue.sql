-- Phase 1: Database Foundation (Supabase SQL)
-- Update Broker Connections to support Priority Queue logic

-- 1. Update Broker Connections to support Priority Queue
ALTER TABLE public.broker_connections 
ADD COLUMN IF NOT EXISTS sync_priority INT DEFAULT 5, -- 1 = Instant, 5 = Routine
ADD COLUMN IF NOT EXISTS last_ping TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_syncing BOOLEAN DEFAULT false;

-- 2. Ensure Journal Entries are unique to prevent double trades
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_trade_connection'
    ) THEN
        ALTER TABLE public.trade_journal_entries 
        ADD CONSTRAINT unique_trade_connection UNIQUE (broker_trade_id, broker_connection_id);
    END IF;
END $$;

-- 3. Create a view for the Go Brain to fetch the next work item
CREATE OR REPLACE VIEW next_sync_task AS
SELECT * FROM broker_connections
WHERE is_active = true AND is_syncing = false
ORDER BY sync_priority ASC, last_sync_at ASC NULLS FIRST
LIMIT 30;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_broker_connections_sync_priority 
  ON public.broker_connections(is_active, sync_priority, is_syncing) 
  WHERE is_active = true AND is_syncing = false;

CREATE INDEX IF NOT EXISTS idx_broker_connections_last_ping 
  ON public.broker_connections(last_ping) 
  WHERE last_ping IS NOT NULL;

COMMENT ON COLUMN public.broker_connections.sync_priority IS 'Lower number = higher priority (1 = Instant/Retry, 5 = Routine)';
COMMENT ON COLUMN public.broker_connections.last_ping IS 'Last heartbeat from MQL5 EA (used for live status indicator)';
COMMENT ON COLUMN public.broker_connections.is_syncing IS 'Prevents multiple containers from syncing the same connection';
