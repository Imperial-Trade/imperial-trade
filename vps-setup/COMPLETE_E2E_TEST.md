# 🧪 Complete End-to-End Test: Frontend → MT5 → Frontend

## 🎯 Test Flow

```
Frontend (Browser)
  ↓ [Encrypts credentials]
  ↓ [POST to Edge Function]
Supabase Edge Function (test-broker-connection)
  ↓ [Forwards to VPS with X-API-Key]
  ↓ [POST http://45.32.89.134:3001/test-connection]
VPS Broker Service (Node.js)
  ↓ [Validates API key]
  ↓ [Decrypts credentials]
  ↓ [Calls Python script]
Python Script (test_connection.py)
  ↓ [Connects to MT5]
  ↓ [mt5.initialize() + mt5.login()]
  ↓ [mt5.account_info()]
  ↓ [Returns account info]
Python Script → VPS Broker Service
  ↓ [Returns JSON response]
VPS Broker Service → Edge Function
  ↓ [Returns to frontend]
Edge Function → Frontend
  ↓ [Displays account info]
  ✅ CONNECTION SUCCESS

Then:
Frontend
  ↓ [Calls sync-broker-trades Edge Function]
Edge Function
  ↓ [Forwards to VPS /fetch-trades]
VPS Broker Service
  ↓ [Calls Python fetch_trades.py]
Python Script
  ↓ [mt5.history_deals_get()]
  ↓ [Returns trades]
Python → VPS → Edge Function → Frontend
  ↓ [Saves to database]
  ↓ [Displays in Journal XX Pro]
  ✅ TRADES FETCHED
```

---

## 📋 Test Steps

### Step 1: Verify Prerequisites
- [ ] MT5 is running on VPS
- [ ] MT5 is logged in (Login: 800107112, Server: ECMarketsLtd-Demo)
- [ ] VPS Broker Service is running (PM2)
- [ ] Edge Function is deployed
- [ ] Frontend is ready

### Step 2: Test Connection
- [ ] Fill in credentials in frontend
- [ ] Click "Connect Broker"
- [ ] Monitor browser console
- [ ] Monitor VPS logs
- [ ] Verify connection success

### Step 3: Test Trade Fetching
- [ ] After connection success, trades should auto-fetch
- [ ] OR click "Sync Trades" button
- [ ] Verify trades appear in Journal XX Pro
- [ ] Check database for saved trades

---

## 🔍 Monitoring Points

### Browser Console
- Look for: `✅ MT5 Connection Successful`
- Look for: `account_info` with login, server, balance
- Look for: Trade fetching logs

### VPS Logs
```powershell
pm2 logs imperial-trade-broker-service --lines 50
```
- Look for: `📥 Received test-connection request`
- Look for: `✅ Credentials decrypted successfully`
- Look for: `✅ MT5 connection successful`
- Look for: `📥 Received fetch-trades request`

### Edge Function Logs
```bash
npx supabase functions logs test-broker-connection
npx supabase functions logs sync-broker-trades
```

---

## ✅ Success Criteria

### Connection Test
- ✅ No 400 errors
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
