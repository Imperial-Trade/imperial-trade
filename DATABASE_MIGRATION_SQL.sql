-- Combined Migration: Connection Status Implementation
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/sql/new

-- ============================================================================
-- Migration 1: Add connection_status column
-- ============================================================================
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

-- ============================================================================
-- Migration 2: Fix next_sync_task view to filter by connection_status
-- ============================================================================
CREATE OR REPLACE VIEW next_sync_task AS
SELECT * FROM broker_connections
WHERE is_active = true 
  AND is_syncing = false
  AND connection_status = 'pending'  -- Only pick up pending connections
ORDER BY sync_priority ASC, last_sync_at ASC NULLS FIRST
LIMIT 30;

COMMENT ON VIEW next_sync_task IS 
'Returns broker connections that need initial processing (status = pending). Go Brain processes these to establish MT5 connections.';

-- Verify the view works
SELECT COUNT(*) as pending_connections FROM next_sync_task;
