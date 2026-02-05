# Quick Start: Database Migration

## ⏳ Final Step - Database Migration

### What to Do

1. **Open Supabase SQL Editor:**
   - URL: https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/sql/new
   - Or: Dashboard → SQL Editor → New Query

2. **Copy SQL from `DATABASE_MIGRATION_SQL.sql`**
   - File location: `/Users/nthny_11/Trade imperial GITHUB /nov 7 notif project/imperial-trade/DATABASE_MIGRATION_SQL.sql`
   - Or copy from below

3. **Paste and Run:**
   - Paste entire SQL into editor
   - Click "Run" or press Cmd+Enter

4. **Verify:**
   - Should see "Success. No rows returned" or success message
   - Run: `SELECT COUNT(*) FROM next_sync_task;` to verify view works

---

## SQL to Run

```sql
-- Add connection_status column
ALTER TABLE public.broker_connections 
ADD COLUMN IF NOT EXISTS connection_status TEXT DEFAULT 'pending'
CHECK (connection_status IN ('pending', 'connecting', 'connected', 'failed'));

-- Update existing rows
UPDATE public.broker_connections
SET connection_status = CASE
  WHEN last_sync_at IS NOT NULL THEN 'connected'
  WHEN last_error IS NOT NULL THEN 'failed'
  ELSE 'pending'
END
WHERE connection_status IS NULL OR connection_status = 'pending';

-- Create index
CREATE INDEX IF NOT EXISTS idx_broker_connections_status 
ON public.broker_connections(connection_status) 
WHERE is_active = true;

-- Fix view
CREATE OR REPLACE VIEW next_sync_task AS
SELECT * FROM broker_connections
WHERE is_active = true 
  AND is_syncing = false
  AND connection_status = 'pending'
ORDER BY sync_priority ASC, last_sync_at ASC NULLS FIRST
LIMIT 30;

-- Verify
SELECT COUNT(*) as pending_connections FROM next_sync_task;
```

---

**Time Required:** 2 minutes
**Status:** Ready to run!
