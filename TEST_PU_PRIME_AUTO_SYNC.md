# 🧪 Test PU Prime Auto-Sync Journal

## 📋 PU Prime Credentials

From the email you provided:
- **MT5 Login:** 18448879
- **MT5 Password:** wb6V8e^t
- **MT5 Server:** PUPrime-Live4

## 🎯 Testing Steps

### Step 1: Add Broker Connection in Journal XX Pro

1. **Navigate to Journal XX Pro**:
   - Go to: https://tradeimperial.com/tools/journal-xx-pro
   - Or: Dashboard → Tools → Journal XX Pro

2. **Add PU Prime Connection**:
   - Click "Connect Broker" or "Auto-Sync" button
   - Select "PU Prime" from broker list
   - Enter credentials:
     - **Account Number:** `18448879`
     - **Password:** `wb6V8e^t`
     - **Server:** `PUPrime-Live4`
   - Click "Connect Broker"

3. **Verify Connection**:
   - You should see a success message
   - Connection status should show "Connected"

### Step 2: Verify Auto-Sync is Running

The auto-sync service on VPS should:
- Fetch trades every 30 seconds (SYNC_INTERVAL)
- Decrypt credentials
- Connect to MT5
- Fetch closed trades from last 90 days
- Send to Supabase `journal-ingestor`
- Upsert into `trade_journal_entries` table

### Step 3: Check for Synced Trades

1. **In Journal XX Pro**:
   - Check the "Auto-Journal" or "Synced Trades" section
   - Trades should appear automatically

2. **Verify in Database**:
   - Check `trade_journal_entries` table
   - Look for entries with:
     - `broker_trade_id` (not null)
     - `broker_connection_id` (matches your connection)
     - `sync_source = 'auto_sync'`

## 🔍 Verification Commands

Run these to verify everything is working:

```sql
-- Check broker connection
SELECT id, user_id, broker_type, is_active, last_sync_at, last_error
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
ORDER BY created_at DESC
LIMIT 10;
```

## ⚠️ Troubleshooting

### If trades don't sync:

1. **Check VPS Service Logs**:
   ```powershell
   pm2 logs "Imperial Broker Service" --lines 50
   ```

2. **Check for Errors**:
   - Look for "Invalid response from MT5 service"
   - Check if credentials are correct
   - Verify MT5 connection

3. **Check Supabase Logs**:
   - Go to: Supabase Dashboard → Edge Functions → journal-ingestor → Logs
   - Look for authentication errors or processing errors

4. **Verify Connection Status**:
   - Check `broker_connections.last_error` field
   - Check `broker_connections.last_sync_at` timestamp

## ✅ Expected Result

After adding the connection:
- ✅ Connection appears in `broker_connections` table
- ✅ Auto-sync service fetches trades every 30 seconds
- ✅ Trades appear in Journal XX Pro automatically
- ✅ Trades have `broker_trade_id` and `sync_source = 'auto_sync'`


