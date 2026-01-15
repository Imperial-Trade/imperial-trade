# 🧪 Complete End-to-End Flow Test

## 🎯 Test Objective
Test the complete flow: **Frontend → Edge Function → VPS → MT5 → VPS → Edge Function → Frontend → Fetch Trades**

---

## 📋 Prerequisites Checklist

### ✅ Before Testing:
- [ ] MT5 is running on VPS
- [ ] MT5 is logged in (Login: 800107112, Password: Demo@123, Server: ECMarketsLtd-Demo)
- [ ] MT5 shows green connection bars (bottom-right corner)
- [ ] Algo Trading button is green (top toolbar)
- [ ] VPS Broker Service is running: `pm2 status`
- [ ] Edge Function is deployed: `npx supabase functions list`
- [ ] Edge Function secrets are set: `npx supabase secrets list`

---

## 🔄 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: FRONTEND CONNECTION TEST                            │
└─────────────────────────────────────────────────────────────┘

Frontend (Browser)
  ↓ [User enters credentials]
  ↓ [Encrypts: login, password, server]
  ↓ [POST to Edge Function]
  ↓ supabase.functions.invoke('test-broker-connection', {
      body: {
        broker_type: 'ecmarkets',
        encrypted_login: '...',
        encrypted_password: '...',
        encrypted_server: '...'
      }
    })

Supabase Edge Function (test-broker-connection)
  ↓ [Validates session]
  ↓ [Forwards to VPS]
  ↓ [POST http://45.32.89.134:3001/test-connection]
  ↓ Headers: {
      'X-API-Key': 'bfa602cd4a12c93cd6a0f6cab9d93ff7b0fcd4dd2392f94e48db2013d679990d',
      'Content-Type': 'application/json'
    }

VPS Broker Service (Node.js)
  ↓ [Validates API key]
  ↓ [Decrypts credentials]
  ↓ [Calls Python script]
  ↓ python test_connection.py '{login, password, server}'

Python Script (test_connection.py)
  ↓ [mt5.initialize(path, login, password, server, timeout)]
  ↓ [mt5.account_info()]
  ↓ [Returns JSON with account info]

Python → VPS → Edge Function → Frontend
  ↓ [Displays account info]
  ✅ CONNECTION SUCCESS

┌─────────────────────────────────────────────────────────────┐
│ STEP 2: FETCH TRADES                                         │
└─────────────────────────────────────────────────────────────┘

Frontend (After Connection)
  ↓ [Auto-fetches trades OR user clicks "Sync Trades"]
  ↓ supabase.functions.invoke('sync-broker-trades', {
      body: {
        broker_type: 'ecmarkets',
        connection_id: '...'
      }
    })

Supabase Edge Function (sync-broker-trades)
  ↓ [Forwards to VPS]
  ↓ [POST http://45.32.89.134:3001/fetch-trades]

VPS Broker Service
  ↓ [Calls Python script]
  ↓ python fetch_trades.py '{login, password, server}'

Python Script (fetch_trades.py)
  ↓ [mt5.initialize()]
  ↓ [mt5.login()]
  ↓ [mt5.wait_for_terminal_sync()]
  ↓ [mt5.history_deals_get()]
  ↓ [Returns trades array]

Python → VPS → Edge Function
  ↓ [Saves trades to database via journal-ingestor]
  ↓ [Returns to frontend]

Frontend
  ↓ [Fetches trades from database]
  ↓ [Displays in Journal XX Pro]
  ✅ TRADES DISPLAYED
```

---

## 🧪 Test Steps

### Step 1: Test Connection
1. Fill in credentials in frontend
2. Click "Connect Broker"
3. **Expected**: Connection successful, account info displayed

### Step 2: Verify Connection Success
- ✅ Status shows "Connected"
- ✅ Account info displayed (login, server, balance)
- ✅ No errors in console

### Step 3: Test Trade Fetching
- ✅ Trades auto-fetch after connection (if configured)
- ✅ OR click "Sync Trades" button
- ✅ Trades appear in Journal XX Pro
- ✅ Trades saved to database

---

## 🔍 Monitoring

### Browser Console (F12)
- Look for: `✅ MT5 Connection Successful`
- Look for: `account_info` object
- Look for: Trade fetching logs

### VPS Logs
```powershell
pm2 logs imperial-trade-broker-service --lines 100
```
- Look for: `📥 Received test-connection request`
- Look for: `✅ Credentials decrypted successfully`
- Look for: `✅ MT5 connection successful`
- Look for: `📥 Received fetch-trades request`

### Edge Function Logs
```bash
npx supabase functions logs test-broker-connection --limit 20
npx supabase functions logs sync-broker-trades --limit 20
```

---

## ✅ Success Criteria

### Connection Test
- ✅ No 400/500 errors
- ✅ Account info returned
- ✅ Connection status: "Connected"
- ✅ Account balance displayed

### Trade Fetching
- ✅ Trades retrieved from MT5
- ✅ Trades saved to database
- ✅ Trades displayed in Journal XX Pro
- ✅ No errors in logs

---

**Status**: ⏳ **TESTING IN PROGRESS**
