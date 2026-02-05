# End-to-End Verification Plan

## Test Credentials
- **Account**: 81071266
- **Password**: Imperial@2026
- **Server**: ECMarkets-MT5-Live01
- **VPS URL**: http://209.222.12.247:3001

---

## Step 1: Verify VPS MT5 Connection (Direct Test)

### Option A: SSH into VPS and Test Directly

```bash
# SSH into VPS
ssh user@209.222.12.247

# Navigate to broker service
cd /path/to/vps-broker-service

# Test connection directly
python3 python/test_connection.py '{"login":"81071266","password":"Imperial@2026","server":"ECMarkets-MT5-Live01"}'
```

**Expected Result:**
```json
{
  "connected": true,
  "account_info": {
    "login": 81071266,
    "server": "ECMarkets-MT5-Live01",
    "balance": <amount>,
    "equity": <amount>
  }
}
```

### Option B: Test via VPS API (Requires API Key)

```bash
curl -X POST http://209.222.12.247:3001/test-connection \
  -H 'Content-Type: application/json' \
  -H 'X-API-Key: YOUR_VPS_API_KEY' \
  -d '{
    "broker_type": "ecmarkets",
    "login": "81071266",
    "password": "Imperial@2026",
    "server": "ECMarkets-MT5-Live01",
    "user_id": "test-user-id"
  }'
```

---

## Step 2: Test Edge Functions

### 2.1 test-broker-connection

**Flow:**
1. Frontend calls Edge Function with credentials
2. Edge Function encrypts credentials
3. Edge Function calls VPS `/test-connection` endpoint
4. VPS tests MT5 connection
5. VPS returns result
6. Edge Function returns result to frontend

**Test via Frontend:**
- Go to Journal XX Pro page
- Click "Connect Broker"
- Enter credentials
- Click "Connect"
- Verify connection status

**Check Logs:**
- Supabase Dashboard → Logs → Edge Functions → `test-broker-connection`
- Look for: "✅ VPS response received", "connected: true"

### 2.2 sync-broker-trades

**Flow:**
1. Frontend calls Edge Function with `connection_id`
2. Edge Function fetches broker connection from DB
3. Edge Function calls VPS `/fetch-trades` endpoint
4. VPS fetches trades from MT5
5. VPS returns trades
6. Edge Function saves trades to `trade_journal_entries`
7. Edge Function updates `last_sync_at`

**Test via Frontend:**
- After connecting broker (Step 2.1)
- Click "Sync Now" button
- Verify trades appear in journal

**Check Logs:**
- Supabase Dashboard → Logs → Edge Functions → `sync-broker-trades`
- Look for: "📡 Calling VPS to fetch trades", "trades_synced: X"

### 2.3 mt5-sync

**Flow:**
1. MQL5 EA (ImperialSync.mq5) sends trades to Edge Function
2. Edge Function authenticates via `x-ingest-key`
3. Edge Function finds matching broker connection
4. Edge Function saves trades to `trade_journal_entries`
5. Edge Function updates `last_sync_at` and `last_ping`

**Test:**
- Requires MQL5 EA to be running in Docker container
- EA automatically sends trades when trades are closed
- Check Supabase logs for incoming requests

**Check Logs:**
- Supabase Dashboard → Logs → Edge Functions → `mt5-sync`
- Look for: "Received trades from account", "trades_synced: X"

---

## Step 3: Verify Data Flow

### 3.1 Database Verification

```sql
-- Check broker connection status
SELECT id, user_id, broker_type, connection_status, last_sync_at, last_ping
FROM broker_connections
WHERE login_id = '81071266'
ORDER BY created_at DESC
LIMIT 1;

-- Check synced trades
SELECT id, symbol, direction, pnl, opened_at, closed_at
FROM trade_journal_entries
WHERE broker_connection_id = '<connection_id>'
ORDER BY closed_at DESC
LIMIT 10;
```

### 3.2 Real-time Verification

- Frontend should show connection status updates
- Trades should appear in journal after sync
- Connection status should change: `pending` → `connecting` → `connected`

---

## Step 4: Troubleshooting

### If VPS Connection Fails:

1. **Check VPS Health:**
   ```bash
   curl http://209.222.12.247:3001/health
   ```

2. **Check VPS Service Status:**
   ```bash
   ssh user@209.222.12.247
   pm2 status
   pm2 logs imperial-trade-broker-service
   ```

3. **Check MT5 Terminal:**
   - Verify MT5_BrokerService is running on VPS
   - Check if MT5 can connect manually
   - Verify credentials are correct

### If Edge Function Fails:

1. **Check Supabase Secrets:**
   - `VPS_MT5_SERVICE_URL`: http://209.222.12.247:3001
   - `VPS_API_KEY`: Should be set
   - `ENCRYPTION_SECRET`: Should match VPS

2. **Check Edge Function Logs:**
   - Supabase Dashboard → Logs → Edge Functions
   - Look for error messages
   - Check request/response details

3. **Check Network:**
   - Verify VPS is accessible from Supabase
   - Check firewall rules (port 3001)
   - Verify DNS resolution

---

## Verification Checklist

- [ ] VPS health endpoint responds
- [ ] Direct MT5 connection works (VPS test)
- [ ] `test-broker-connection` Edge Function works
- [ ] `sync-broker-trades` Edge Function works
- [ ] Trades appear in database after sync
- [ ] Connection status updates correctly
- [ ] Real-time updates work (if implemented)
- [ ] `mt5-sync` can receive data (requires EA)

---

## Expected Timeline

1. **VPS Direct Test**: 30 seconds
2. **test-broker-connection**: 30-60 seconds (includes MT5 connection)
3. **sync-broker-trades**: 10-30 seconds (depends on trade count)
4. **mt5-sync**: Continuous (runs when EA sends trades)

---

## Success Criteria

✅ All three Edge Functions can communicate with VPS  
✅ MT5 connection is established successfully  
✅ Trades are synced and saved to database  
✅ Connection status is tracked correctly  
✅ No errors in logs
