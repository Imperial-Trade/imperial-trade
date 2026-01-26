# 🧪 Test Auto-Sync Journal on Localhost

## 📋 PU Prime Credentials

- **MT5 Login:** 18448879
- **MT5 Password:** wb6V8e^t
- **MT5 Server:** PUPrime-Live4

## 🚀 Quick Test Steps

### Step 1: Open Localhost
1. Navigate to: **http://localhost:8080**
2. Log in to your account

### Step 2: Go to Journal XX Pro
1. Navigate to: **http://localhost:8080/dashboard/journal-xx-pro**
2. Or: Dashboard → Tools → Journal XX Pro

### Step 3: Add PU Prime Broker Connection

1. **Click "Connect Broker" or "Auto-Sync" button**
2. **Select "PU Prime"** from the broker list
3. **Enter credentials:**
   - **Account Number:** `18448879`
   - **Password:** `wb6V8e^t`
   - **Server:** `PUPrime-Live4`
4. **Click "Connect Broker"**

### Step 4: Verify Connection

- ✅ You should see a success message
- ✅ Connection status should show "Connected"
- ✅ The connection appears in the Auto-Journal view

### Step 5: Wait for Auto-Sync

The VPS auto-sync service runs every **30 seconds** and will:
- Fetch trades from your MT5 account
- Sync them to Journal XX Pro automatically
- Trades will appear in the "Auto-Journal" or "Synced Trades" section

## 🔍 Verification

### Check in Database

Run this SQL query in Supabase:

```sql
-- Check broker connection
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
LIMIT 5;

-- Check synced trades
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

### Check VPS Service Logs

```powershell
pm2 logs "Imperial Broker Service" --lines 50
```

Look for:
- ✅ "Syncing trades for connection..."
- ✅ "Sent X trades to Supabase"
- ❌ "Invalid response from MT5 service" (if credentials are wrong)

## ⚠️ Troubleshooting

### If connection fails:
1. **Check credentials** - Make sure server name is exactly `PUPrime-Live4`
2. **Check MT5** - Ensure MT5 is installed and accessible
3. **Check VPS logs** - Look for authentication errors

### If trades don't sync:
1. **Wait 30-60 seconds** - Auto-sync runs every 30 seconds
2. **Check VPS service** - Ensure "Imperial Broker Service" is running
3. **Check Supabase logs** - Look for `journal-ingestor` function logs
4. **Verify connection** - Check `broker_connections.last_sync_at` timestamp

## ✅ Expected Result

After adding the connection:
- ✅ Connection saved in `broker_connections` table
- ✅ Auto-sync fetches trades every 30 seconds
- ✅ Trades appear in Journal XX Pro automatically
- ✅ Trades have `broker_trade_id` and `sync_source = 'auto_sync'`


