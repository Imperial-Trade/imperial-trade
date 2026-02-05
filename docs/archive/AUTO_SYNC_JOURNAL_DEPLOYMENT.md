# Auto-Sync Journal Deployment Complete ✅

## What Was Implemented

### 1. ✅ Auto-Sync Service (`vps-broker-service/src/auto-sync.ts`)
- Continuously syncs trades from MT5 brokers to Supabase
- Queries Supabase for active broker connections every 30 seconds
- Fetches trades from MT5 via Python API
- Sends trades to Supabase `journal-ingestor` edge function
- Updates `last_sync_at` timestamp in `broker_connections` table

### 2. ✅ Supabase Edge Function (`supabase/functions/journal-ingestor/index.ts`)
- Receives trades from VPS auto-sync service
- Validates and transforms trade data
- Upserts to `trade_journal_entries` table
- Prevents duplicates using unique constraint on `(broker_trade_id, broker_connection_id)`
- Updates `broker_connections.last_sync_at`

### 3. ✅ Database Migration
- Added unique index on `(broker_trade_id, broker_connection_id)`
- Prevents duplicate trades from being synced multiple times
- Migration applied successfully

### 4. ✅ Updated Broker Service
- Integrated auto-sync into main service (`src/index.ts`)
- Auto-sync starts automatically when service starts
- Runs in background alongside API endpoints

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    VPS (Vultr)                          │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Imperial Broker Service (Port 3001)             │  │
│  │  - API Endpoints (/test-connection, /fetch)     │  │
│  │  - Auto-Sync Service (runs every 30s)            │  │
│  └───────────────────┬──────────────────────────────┘  │
│                      │                                   │
│  ┌───────────────────▼──────────────────────────────┐  │
│  │  MT5 Terminal (EC Markets)                        │  │
│  │  - Python MetaTrader5 API                         │  │
│  │  - Connects to user's broker                      │  │
│  └──────────────────────────────────────────────────┘  │
└───────────────────────┬───────────────────────────────────┘
                       │
                       │ HTTP POST with X-INGEST-KEY
                       ▼
┌─────────────────────────────────────────────────────────┐
│                  Supabase Cloud                         │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  journal-ingestor Edge Function                  │  │
│  │  - Validates trades                              │  │
│  │  - Upserts to database                           │  │
│  └───────────────────┬──────────────────────────────┘  │
│                      │                                   │
│  ┌───────────────────▼──────────────────────────────┐  │
│  │  trade_journal_entries table                     │  │
│  │  - is_synced = true                              │  │
│  │  - sync_source = 'auto_sync'                     │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Deployment Steps

### Step 1: Deploy Supabase Edge Function

```bash
cd /path/to/imperial-trade
supabase functions deploy journal-ingestor
```

**Set Edge Function Secret:**
- Go to Supabase Dashboard → Edge Functions → journal-ingestor → Settings
- Add secret: `INGEST_SECRET` (same value as in VPS `.env`)

### Step 2: Update VPS Environment Variables

On your VPS, edit `C:\vps-broker-service\.env`:

```bash
# Existing
PORT=3001
VPS_API_KEY=your-api-key
ENCRYPTION_SECRET=ImperialTrade_BrokerEncryption_2025_v1

# NEW - Add these:
SUPABASE_URL=https://kmuoqkcxguafxulqlbmi.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
INGEST_SECRET=your-ingest-secret
SYNC_INTERVAL=30000
```

### Step 3: Rebuild and Restart Service on VPS

```powershell
cd C:\vps-broker-service
npm install
npm run build
pm2 restart "Imperial Broker Service"
pm2 logs "Imperial Broker Service" --lines 30
```

You should see:
```
🚀 Auto-Sync Journal Service starting...
📊 Sync interval: 30 seconds
✅ Auto-Sync Journal Service running
```

## How It Works

1. **Every 30 seconds**, the auto-sync service:
   - Queries Supabase for all active broker connections (`is_active = true`)
   - For each connection:
     - Decrypts credentials
     - Connects to MT5 and fetches trades
     - Transforms trades to journal format
     - Sends to `journal-ingestor` edge function
     - Updates `last_sync_at` timestamp

2. **Edge function** receives trades and:
   - Validates trade data
   - Upserts to `trade_journal_entries` (prevents duplicates)
   - Updates `broker_connections.last_sync_at`

3. **Users see trades** in their journal automatically:
   - Trades appear in "AUTO" mode in Journal XX
   - Marked with `is_synced = true`
   - `sync_source = 'auto_sync'`

## Testing

### 1. Check Auto-Sync is Running:
```powershell
pm2 logs "Imperial Broker Service" --lines 50
```

Look for:
- `🔄 Starting sync cycle...`
- `📋 Found X active broker connection(s)`
- `✅ Successfully synced X trades`

### 2. Check Database:
```sql
-- Check last sync times
SELECT 
  id,
  user_id,
  broker_type,
  last_sync_at,
  last_error
FROM broker_connections
WHERE is_active = true;

-- Check synced trades
SELECT 
  id,
  asset_ticker,
  pnl,
  is_synced,
  sync_source,
  created_at
FROM trade_journal_entries
WHERE is_synced = true
  AND sync_source = 'auto_sync'
ORDER BY created_at DESC
LIMIT 10;
```

### 3. Check Edge Function Logs:
- Supabase Dashboard → Edge Functions → journal-ingestor → Logs
- Should show successful trade processing

## Configuration

### Sync Interval
Change `SYNC_INTERVAL` in `.env`:
- `30000` = 30 seconds (default)
- `60000` = 1 minute
- `120000` = 2 minutes

### Disable Auto-Sync
Comment out in `src/index.ts`:
```typescript
// startAutoSync().catch(...);
```

## Files Created/Modified

### New Files:
- ✅ `vps-broker-service/src/auto-sync.ts` - Auto-sync service
- ✅ `supabase/functions/journal-ingestor/index.ts` - Edge function
- ✅ `vps-broker-service/AUTO_SYNC_SETUP.md` - Setup guide
- ✅ `AUTO_SYNC_JOURNAL_DEPLOYMENT.md` - This file

### Modified Files:
- ✅ `vps-broker-service/src/index.ts` - Added auto-sync startup
- ✅ Database: Added unique constraint on `(broker_trade_id, broker_connection_id)`

## Next Steps

1. **Deploy edge function** to Supabase
2. **Update VPS .env** with new variables
3. **Rebuild and restart** service on VPS
4. **Test** with a user who has an active broker connection
5. **Monitor** logs to ensure trades are syncing

## Troubleshooting

See `vps-broker-service/AUTO_SYNC_SETUP.md` for detailed troubleshooting guide.


