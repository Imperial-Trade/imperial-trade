# ✅ Enterprise Stage 3 - Deployment Status

## Completed Steps

### ✅ Step 1: Database Migration (COMPLETE)

**Migration Applied:** `add_sync_priority_queue`

**What Was Added:**
- ✅ `sync_priority` column (INT, default 5) - Priority queue support
- ✅ `last_ping` column (TIMESTAMP) - Heartbeat tracking
- ✅ `is_syncing` column (BOOLEAN) - Prevents duplicate syncs
- ✅ `next_sync_task` view - Queue view for Go Brain
- ✅ Unique constraint on `trade_journal_entries` (broker_trade_id + broker_connection_id)
- ✅ Performance indexes

**Status:** ✅ Migration applied successfully via Supabase MCP

---

### ✅ Step 2: Edge Function Deployment (COMPLETE)

**Function:** `mt5-sync`

**Deployment Status:**
- ✅ Function deployed to Supabase
- ✅ Secret `INGEST_SECRET` set to `Imperial_Secret_2026`
- ✅ Function URL: `https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/mt5-sync`
- ✅ Config added to `supabase/config.toml`

**Function Location:**
- File: `supabase/functions/mt5-sync/index.ts`
- Dashboard: https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/functions/mt5-sync

**What It Does:**
- Receives trade data from MQL5 EA
- Authenticates via `x-ingest-key` header
- Upserts trades to `trade_journal_entries` with deduplication
- Updates `broker_connections.last_sync_at` and `last_ping`
- Clears `is_syncing` flag after sync

---

## Next Steps (Manual Execution Required)

### Step 3: VPS Foundation Setup

**SSH to VPS:**
```bash
ssh root@209.222.12.247
# Password: eJ)3-BJ9p9RsF2S$
```

**Run One-Click Setup:**
```bash
# Update and Install Docker, Go, Wine, Xvfb
apt update && apt upgrade -y
apt install docker.io golang-go wine64 wine32:i386 xvfb unzip wget -y
systemctl enable --now docker

# Create directory structure
mkdir -p /root/imperial-factory/mt5-master
mkdir -p /root/imperial-factory/brain

# Verify installations
docker --version
go version
wine --version
```

### Step 4: Build Docker Image

**On VPS:**
1. Download MT5 (see plan for details)
2. Create Dockerfile at `/root/imperial-factory/mt5-master/Dockerfile`
   - Copy from: `docs/Dockerfile.imperial-mt5-worker`
3. Build image:
   ```bash
   cd /root/imperial-factory/mt5-master
   docker build -t imperial-worker .
   ```

### Step 5: Go Brain Implementation

**Use Cursor AI Composer (Cmd+I) with this prompt:**

> "Cursor, I am building the Imperial Brain in Go. It needs to manage a pool of Docker containers. It must decrypt MT5 passwords from Supabase, write a temporary launch.ini, mount it into the imperial-worker container, and ensure the container is deleted after 90 seconds to prevent RAM leaks. Handle the database updates using pgx for high performance."

**Reference Files:**
- Template: `docs/go-brain-main.go.template`
- Systemd service: `docs/imperial-brain.service`

### Step 6: MQL5 EA

**On Mac:**
1. Open MetaEditor in MT5
2. Create new Expert Advisor
3. Copy code from: `docs/ImperialSync.mq5`
4. Compile (F7)
5. Upload to VPS: `scp ~/Documents/MQL5/Experts/ImperialSync.ex5 root@209.222.12.247:/root/imperial-factory/mt5-master/MQL5/Experts/`

---

## Verification

### Test Database Migration

Run in Supabase SQL Editor:
```sql
-- Check columns exist
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'broker_connections' 
AND column_name IN ('sync_priority', 'last_ping', 'is_syncing');

-- Check view exists
SELECT * FROM next_sync_task LIMIT 1;
```

### Test Edge Function

```bash
curl -X POST https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/mt5-sync \
  -H "Content-Type: application/json" \
  -H "x-ingest-key: Imperial_Secret_2026" \
  -d '{"account":"123456","trades":[]}'
```

Expected: `{"success":true,"trades_synced":0}`

---

## Summary

✅ **Database:** Migration applied - Priority queue system ready
✅ **Edge Function:** Deployed and configured - Ready to receive MQL5 data
⏳ **VPS Setup:** Needs manual execution on VPS
⏳ **Docker Image:** Needs to be built on VPS
⏳ **Go Brain:** Needs implementation with Cursor AI
⏳ **MQL5 EA:** Needs compilation and upload

**Backend infrastructure (Database + Edge Function) is ready. Frontend and VPS components need manual setup.**
