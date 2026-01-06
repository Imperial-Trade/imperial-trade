-- Create broker_connections table for storing encrypted MT5 credentials
-- SECURITY: Credentials are encrypted client-side before storage

DO $$ BEGIN
  CREATE TYPE broker_type AS ENUM ('XS', 'EC_MARKETS', 'PU_PRIME');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.broker_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  broker_type broker_type NOT NULL,
  
  -- Encrypted credentials (encrypted client-side with AES-256-GCM)
  encrypted_login TEXT NOT NULL,
  encrypted_password TEXT NOT NULL,
  encrypted_server TEXT NOT NULL,
  
  -- Hash for detecting credential changes (without storing plaintext)
  credentials_hash TEXT NOT NULL,
  
  -- Connection status
  is_active BOOLEAN DEFAULT true NOT NULL,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  last_error TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  
  -- Ensure one active connection per user per broker
  UNIQUE(user_id, broker_type)
);

-- Enable RLS
ALTER TABLE public.broker_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop first if exists to avoid errors)
DROP POLICY IF EXISTS "Users can view their own broker connections" ON public.broker_connections;
DROP POLICY IF EXISTS "Users can create their own broker connections" ON public.broker_connections;
DROP POLICY IF EXISTS "Users can update their own broker connections" ON public.broker_connections;
DROP POLICY IF EXISTS "Users can delete their own broker connections" ON public.broker_connections;

CREATE POLICY "Users can view their own broker connections"
  ON public.broker_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own broker connections"
  ON public.broker_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own broker connections"
  ON public.broker_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own broker connections"
  ON public.broker_connections FOR DELETE
  USING (auth.uid() = user_id);

-- Add index for faster lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_broker_connections_user_id ON public.broker_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_broker_connections_active ON public.broker_connections(user_id, is_active) WHERE is_active = true;

-- Add columns to trade_journal_entries for synced trades
ALTER TABLE public.trade_journal_entries
  ADD COLUMN IF NOT EXISTS broker_trade_id TEXT,
  ADD COLUMN IF NOT EXISTS broker_connection_id UUID REFERENCES public.broker_connections(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_synced BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sync_source TEXT, -- 'manual' or 'broker_sync'
  ADD COLUMN IF NOT EXISTS commission DECIMAL,
  ADD COLUMN IF NOT EXISTS swap_fees DECIMAL,
  ADD COLUMN IF NOT EXISTS pnl_percent DECIMAL,
  ADD COLUMN IF NOT EXISTS stop_loss DECIMAL,
  ADD COLUMN IF NOT EXISTS take_profit DECIMAL,
  ADD COLUMN IF NOT EXISTS entry_time TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS exit_time TIMESTAMP WITH TIME ZONE;

-- Index for synced trades
CREATE INDEX IF NOT EXISTS idx_trade_journal_synced ON public.trade_journal_entries(broker_connection_id, is_synced);
CREATE INDEX IF NOT EXISTS idx_trade_journal_broker_trade_id ON public.trade_journal_entries(broker_trade_id);

-- Unique constraint to prevent duplicate broker trades
-- Only applies to synced trades (broker_trade_id and broker_connection_id must both be NOT NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_trade_journal_broker_trade_unique 
ON public.trade_journal_entries(broker_trade_id, broker_connection_id) 
WHERE broker_trade_id IS NOT NULL AND broker_connection_id IS NOT NULL;

-- SECURITY: Credentials are encrypted client-side before storage

DO $$ BEGIN
  CREATE TYPE broker_type AS ENUM ('XS', 'EC_MARKETS', 'PU_PRIME');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.broker_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  broker_type broker_type NOT NULL,
  
  -- Encrypted credentials (encrypted client-side with AES-256-GCM)
  encrypted_login TEXT NOT NULL,
  encrypted_password TEXT NOT NULL,
  encrypted_server TEXT NOT NULL,
  
  -- Hash for detecting credential changes (without storing plaintext)
  credentials_hash TEXT NOT NULL,
  
  -- Connection status
  is_active BOOLEAN DEFAULT true NOT NULL,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  last_error TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  
  -- Ensure one active connection per user per broker
  UNIQUE(user_id, broker_type)
);

-- Enable RLS
ALTER TABLE public.broker_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop first if exists to avoid errors)
DROP POLICY IF EXISTS "Users can view their own broker connections" ON public.broker_connections;
DROP POLICY IF EXISTS "Users can create their own broker connections" ON public.broker_connections;
DROP POLICY IF EXISTS "Users can update their own broker connections" ON public.broker_connections;
DROP POLICY IF EXISTS "Users can delete their own broker connections" ON public.broker_connections;

CREATE POLICY "Users can view their own broker connections"
  ON public.broker_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own broker connections"
  ON public.broker_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own broker connections"
  ON public.broker_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own broker connections"
  ON public.broker_connections FOR DELETE
  USING (auth.uid() = user_id);

-- Add index for faster lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_broker_connections_user_id ON public.broker_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_broker_connections_active ON public.broker_connections(user_id, is_active) WHERE is_active = true;

-- Add columns to trade_journal_entries for synced trades
ALTER TABLE public.trade_journal_entries
  ADD COLUMN IF NOT EXISTS broker_trade_id TEXT,
  ADD COLUMN IF NOT EXISTS broker_connection_id UUID REFERENCES public.broker_connections(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_synced BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sync_source TEXT, -- 'manual' or 'broker_sync'
  ADD COLUMN IF NOT EXISTS commission DECIMAL,
  ADD COLUMN IF NOT EXISTS swap_fees DECIMAL,
  ADD COLUMN IF NOT EXISTS pnl_percent DECIMAL,
  ADD COLUMN IF NOT EXISTS stop_loss DECIMAL,
  ADD COLUMN IF NOT EXISTS take_profit DECIMAL,
  ADD COLUMN IF NOT EXISTS entry_time TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS exit_time TIMESTAMP WITH TIME ZONE;

-- Index for synced trades
CREATE INDEX IF NOT EXISTS idx_trade_journal_synced ON public.trade_journal_entries(broker_connection_id, is_synced);
CREATE INDEX IF NOT EXISTS idx_trade_journal_broker_trade_id ON public.trade_journal_entries(broker_trade_id);

-- Unique constraint to prevent duplicate broker trades
-- Only applies to synced trades (broker_trade_id and broker_connection_id must both be NOT NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_trade_journal_broker_trade_unique 
ON public.trade_journal_entries(broker_trade_id, broker_connection_id) 
WHERE broker_trade_id IS NOT NULL AND broker_connection_id IS NOT NULL;

-- SECURITY: Credentials are encrypted client-side before storage

DO $$ BEGIN
  CREATE TYPE broker_type AS ENUM ('XS', 'EC_MARKETS', 'PU_PRIME');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.broker_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  broker_type broker_type NOT NULL,
  
  -- Encrypted credentials (encrypted client-side with AES-256-GCM)
  encrypted_login TEXT NOT NULL,
  encrypted_password TEXT NOT NULL,
  encrypted_server TEXT NOT NULL,
  
  -- Hash for detecting credential changes (without storing plaintext)
  credentials_hash TEXT NOT NULL,
  
  -- Connection status
  is_active BOOLEAN DEFAULT true NOT NULL,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  last_error TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  
  -- Ensure one active connection per user per broker
  UNIQUE(user_id, broker_type)
);

-- Enable RLS
ALTER TABLE public.broker_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop first if exists to avoid errors)
DROP POLICY IF EXISTS "Users can view their own broker connections" ON public.broker_connections;
DROP POLICY IF EXISTS "Users can create their own broker connections" ON public.broker_connections;
DROP POLICY IF EXISTS "Users can update their own broker connections" ON public.broker_connections;
DROP POLICY IF EXISTS "Users can delete their own broker connections" ON public.broker_connections;

CREATE POLICY "Users can view their own broker connections"
  ON public.broker_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own broker connections"
  ON public.broker_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own broker connections"
  ON public.broker_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own broker connections"
  ON public.broker_connections FOR DELETE
  USING (auth.uid() = user_id);

-- Add index for faster lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_broker_connections_user_id ON public.broker_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_broker_connections_active ON public.broker_connections(user_id, is_active) WHERE is_active = true;

-- Add columns to trade_journal_entries for synced trades
ALTER TABLE public.trade_journal_entries
  ADD COLUMN IF NOT EXISTS broker_trade_id TEXT,
  ADD COLUMN IF NOT EXISTS broker_connection_id UUID REFERENCES public.broker_connections(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_synced BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sync_source TEXT, -- 'manual' or 'broker_sync'
  ADD COLUMN IF NOT EXISTS commission DECIMAL,
  ADD COLUMN IF NOT EXISTS swap_fees DECIMAL,
  ADD COLUMN IF NOT EXISTS pnl_percent DECIMAL,
  ADD COLUMN IF NOT EXISTS stop_loss DECIMAL,
  ADD COLUMN IF NOT EXISTS take_profit DECIMAL,
  ADD COLUMN IF NOT EXISTS entry_time TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS exit_time TIMESTAMP WITH TIME ZONE;

-- Index for synced trades
CREATE INDEX IF NOT EXISTS idx_trade_journal_synced ON public.trade_journal_entries(broker_connection_id, is_synced);
CREATE INDEX IF NOT EXISTS idx_trade_journal_broker_trade_id ON public.trade_journal_entries(broker_trade_id);

-- Unique constraint to prevent duplicate broker trades
-- Only applies to synced trades (broker_trade_id and broker_connection_id must both be NOT NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_trade_journal_broker_trade_unique 
ON public.trade_journal_entries(broker_trade_id, broker_connection_id) 
WHERE broker_trade_id IS NOT NULL AND broker_connection_id IS NOT NULL;




