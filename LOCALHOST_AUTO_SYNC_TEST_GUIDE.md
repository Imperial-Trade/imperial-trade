# 🧪 Localhost Auto-Sync Test Guide

## ✅ Prerequisites

- ✅ Localhost running on **http://localhost:8080**
- ✅ VPS Auto-Sync Service running (verified ✅)
- ✅ PU Prime Credentials ready

## 📋 PU Prime Credentials

- **MT5 Login:** `18448879`
- **MT5 Password:** `wb6V8e^t`
- **MT5 Server:** `PUPrime-Live4`

## 🚀 Step-by-Step Test

### Step 1: Log In to Localhost

1. Open: **http://localhost:8080**
2. Click "Sign In" or navigate to `/signin`
3. Enter your email and password
4. Click "Sign In"

### Step 2: Navigate to Journal XX Pro

1. After logging in, go to: **http://localhost:8080/dashboard/journal-xx-pro**
2. Or: Dashboard → Tools → Journal XX Pro

### Step 3: Add PU Prime Broker Connection

1. **Look for "Connect Broker" or "Auto-Sync" button**
   - Usually in the Auto-Journal section
   - Or in the settings/setup area

2. **Click to open broker connection form**

3. **Select "PU Prime"** from the broker list

4. **Fill in the form:**
   - **Account Number:** `18448879`
   - **Password:** `wb6V8e^t`
   - **Server:** `PUPrime-Live4`

5. **Click "Connect Broker"**

6. **Wait for connection test** (should show success ✅)

### Step 4: Verify Connection in Database

Run this in Supabase SQL Editor:

```sql
SELECT 
  id, 
  user_id, 
  broker_type, 
  is_active, 
  last_sync_at, 
  last_error,
  created_at
FROM broker_connections
WHERE broker_type = 'PU_PRIME'
ORDER BY created_at DESC
LIMIT 1;
```

### Step 5: Wait for Auto-Sync (30-60 seconds)

The VPS service syncs every **30 seconds**. After adding the connection:

1. **Wait 30-60 seconds**
2. **Check Journal XX Pro** - Trades should appear automatically
3. **Check VPS logs** - Should show sync activity

### Step 6: Verify Synced Trades

Run this SQL query:

```sql
SELECT 
  id, 
  asset_ticker, 
  trade_type, 
  pnl, 
  trade_date,
  broker_trade_id,
  broker_connection_id,
  sync_source,
  created_at
FROM trade_journal_entries
WHERE broker_trade_id IS NOT NULL
  AND broker_connection_id IN (
    SELECT id FROM broker_connections WHERE broker_type = 'PU_PRIME'
  )
ORDER BY created_at DESC
LIMIT 10;
```

## 🔍 Monitoring

### Check VPS Service Logs

```powershell
pm2 logs "Imperial Broker Service" --lines 50
```

**Look for:**
- ✅ "Syncing trades for connection..."
- ✅ "Sent X trades to Supabase"
- ✅ "Auto-sync completed successfully"
- ❌ "Invalid response from MT5 service" (if credentials wrong)

### Check Supabase Edge Function Logs

1. Go to: Supabase Dashboard → Edge Functions → `journal-ingestor` → Logs
2. Look for successful POST requests with status 200

## ⚠️ Troubleshooting

### Connection Fails:
- ✅ Check server name: Must be exactly `PUPrime-Live4`
- ✅ Verify credentials are correct
- ✅ Check if MT5 is accessible from VPS

### Trades Don't Sync:
- ✅ Wait 30-60 seconds (sync interval)
- ✅ Check VPS service is running: `pm2 list`
- ✅ Check `broker_connections.last_error` field
- ✅ Verify `broker_connections.is_active = true`

### "Invalid response from MT5 service":
- ✅ Check if Python MetaTrader5 library is installed on VPS
- ✅ Verify MT5 terminal is accessible
- ✅ Check Python script: `C:\vps-broker-service\python\fetch_trades.py`

## ✅ Success Indicators

After successful setup:
- ✅ Broker connection appears in `broker_connections` table
- ✅ `is_active = true` and `last_sync_at` is updated
- ✅ Trades appear in Journal XX Pro with `broker_trade_id`
- ✅ VPS logs show successful syncs
- ✅ Supabase logs show successful ingestion

## 📊 Expected Timeline

- **0-5 seconds:** Connection added to database
- **30 seconds:** First auto-sync attempt
- **30-60 seconds:** Trades appear in Journal XX Pro
- **Every 30 seconds:** Continuous sync (if new trades)


