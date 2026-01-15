# 🚀 Deploy and Test Now - Step by Step

## ✅ Pre-Deployment Verification

### 1. Code Status
- ✅ VPS service code: Built and ready
- ✅ Frontend code: Built and ready
- ✅ Edge Functions: Deployed and active
- ✅ Secrets: Configured

---

## 🚀 Step 1: Deploy VPS Service (On Windows VPS)

### Open PowerShell as Administrator

**Right-click PowerShell → "Run as Administrator"**

### Run Deployment Script

```powershell
cd C:\vps-broker-service
.\vps-setup\DEPLOY_NOW_SAFE.ps1
```

**Wait for completion** (about 1-2 minutes)

**Expected Output**:
```
═══════════════════════════════════════════════════════════════════════════════
  🚀 DEPLOYING BROKER SERVICE
  🔒 IMPERIAL PRICE FEEDER PROTECTED
═══════════════════════════════════════════════════════════════════════════════

🔒 STEP 1: Verifying Price Feeder Status
✅ Price Feeder is running - PROTECTED

📦 STEP 2: Installing Dependencies
✅ Dependencies ready

🔨 STEP 3: Building Service
✅ Build successful

🔄 STEP 4: Restarting Broker Service (Price Feeder Protected)
✅ Connection test job queued

🔒 STEP 5: Verifying Price Feeder Still Running
✅ Price Feeder is STILL running - PROTECTED

💾 STEP 6: Saving PM2 Configuration
✅ Configuration saved

═══════════════════════════════════════════════════════════════════════════════
  ✅ DEPLOYMENT COMPLETE
═══════════════════════════════════════════════════════════════════════════════

📊 Service Status:
┌─────┬──────────────────────────────┬─────────┬─────────┬──────────┐
│ id  │ name                         │ status  │ restart │ uptime   │
├─────┼──────────────────────────────┼─────────┼─────────┼──────────┤
│ 0   │ Imperial Price Feeder        │ online  │ 0       │ 2h 30m   │
│ 1   │ imperial-trade-broker-service│ online  │ 0       │ 0m 5s    │
└─────┴──────────────────────────────┴─────────┴─────────┴──────────┘

✅ Price Feeder: PROTECTED AND RUNNING
✅ Broker Service: DEPLOYED
🔒 Price Feeder was never stopped during deployment
```

---

## ✅ Step 2: Verify Deployment

### Check Services

```powershell
pm2 list
```

**Both should show "online"**:
- ✅ Imperial Price Feeder
- ✅ imperial-trade-broker-service

### Test Health Endpoint

```powershell
$apiKey = "bfa602cd4a12c93cd6a0f6cab9d93ff7b0fcd4dd2392f94e48db2013d679990d"
Invoke-WebRequest -Uri "http://localhost:3001/health" -Headers @{"X-API-Key"=$apiKey}
```

**Expected Response**:
```json
{
  "status": "ok",
  "service": "imperial-trade-broker-service",
  "version": "1.0.0",
  "timestamp": "2025-01-15T..."
}
```

### Check Logs

```powershell
pm2 logs imperial-trade-broker-service --lines 20
```

**Look for**:
- ✅ `✅ SERVER STARTED SUCCESSFULLY`
- ✅ `🚀 Imperial Trade Broker Service running on 0.0.0.0:3001`
- ⚠️ `⚠️  Queue system unavailable` (OK - falls back to direct processing)

---

## 🧪 Step 3: Test Frontend Connection

### Start Frontend (If Not Running)

**On your local machine**:
```bash
npm run dev
```

**Expected**: Server starts on `http://localhost:5173` or `http://localhost:8081`

### Navigate to Journal XX Pro

1. **Open browser**: `http://localhost:5173/dashboard/journal-xx-pro`
2. **Log in** if needed
3. **Navigate to**: "Auto Journal" tab

### Connect Broker

1. **Select Broker**: Click "EC Markets"
2. **Enter Credentials**:
   - **Login**: `800107112`
   - **Password**: `Demo@123`
   - **Server**: `ECMarketsLtd-Demo`
3. **Click**: "Connect Broker"

---

## 📊 Step 4: Monitor Connection Process

### Browser Console (F12 → Console)

**Success Messages**:
```
✅ User session valid: { userId: "...", hasSession: true }
📡 Calling Edge Function with: { broker_type: "ecmarkets", ... }
✅ MT5 Connection Successful: {
  login: 800107112,
  server: "ECMarketsLtd-Demo",
  balance: 1129.46,
  currency: "USD",
  leverage: 500
}
```

**Error Messages** (if any):
- `❌ Edge Function error` → Check Edge Function logs
- `❌ Missing authorization header` → Refresh page
- `❌ Connection test failed` → Check VPS logs

---

### Network Tab (F12 → Network)

**Look for**:
1. **Request**: `test-broker-connection`
   - Status: `200` ✅
   - Method: `POST` ✅
   - Response:
   ```json
   {
     "success": true,
     "connected": true,
     "account_info": {
       "login": 800107112,
       "server": "ECMarketsLtd-Demo",
       "balance": 1129.46,
       "currency": "USD"
     },
     "server_used": "ECMarketsLtd-Demo"
   }
   ```

2. **Request**: `sync-broker-trades` (after connection)
   - Status: `200` ✅
   - Response: `{ success: true, trades: [...] }`

---

### Status Messages in UI

**During Connection**:
1. ✅ "Testing connection..." (5-10 seconds)
2. ✅ "Verifying credentials..."
3. ✅ "Saving connection..."
4. ✅ "✅ Connected to MT5 Account 800107112 on ECMarketsLtd-Demo. Balance: 1,129.46 USD"
5. ✅ "Fetching trade history..." (10-20 seconds)
6. ✅ "Connected successfully!"

---

### Toast Notifications

**Success Toast**:
```
Broker Connected ✅
MT5 Account 800107112 connected on ECMarketsLtd-Demo. Balance: 1,129.46 USD. Fetching trade history...
```

---

## 🔍 Step 5: Verify End-to-End Flow

### Check Edge Function Logs

**Supabase Dashboard** → Functions → `test-broker-connection` → Logs

**Look for**:
- ✅ `📡 Calling VPS at: http://45.32.89.134:3001/test-connection`
- ✅ `✅ VPS response received: { connected: true, account_info: {...} }`
- ✅ `✅ Connection verified for user ..., broker: ecmarkets, login: 800107112`

---

### Check VPS Service Logs

**On VPS**:
```powershell
pm2 logs imperial-trade-broker-service --lines 50
```

**Look for**:
- ✅ `📥 Received test-connection request`
- ✅ `✅ Credentials decrypted successfully: { login: 800107112, server: "ECMarketsLtd-Demo" }`
- ✅ `✅ MT5 connection successful: { login: 800107112, server: "ECMarketsLtd-Demo", balance: 1129.46 }`

---

## ✅ Success Criteria

After deployment and testing:

- [ ] Price Feeder: Still running (was never stopped)
- [ ] Broker Service: Running and accessible
- [ ] Health endpoint: Returns 200
- [ ] Frontend: Can navigate to Journal XX Pro
- [ ] Connection test: Succeeds
- [ ] Account info: Displayed in status message
- [ ] Account info: Displayed in toast notification
- [ ] Account info: Logged in console
- [ ] Trades: Fetched and displayed
- [ ] No errors in browser console
- [ ] No errors in Edge Function logs
- [ ] No errors in VPS service logs

---

## 🐛 Troubleshooting

### Issue: "VPS service not accessible"

**Check**:
1. Service running: `pm2 list`
2. Firewall allows port 3001
3. VPS IP is correct: `45.32.89.134`

**Fix**:
```powershell
# Restart service
pm2 restart imperial-trade-broker-service

# Check firewall
Get-NetFirewallRule | Where-Object {$_.DisplayName -like "*3001*"}
```

---

### Issue: "Connection test failed"

**Check**:
1. MT5 terminal running on VPS
2. "Allow Algorithmic Trading" enabled
3. Credentials are correct

**Fix**:
1. Open Generic MT5 on VPS
2. Log in manually once
3. Enable "Allow Algorithmic Trading"
4. Keep terminal open

---

### Issue: "Account info not displayed"

**Check**:
1. Browser console for `✅ MT5 Connection Successful`
2. Network tab for `account_info` in response
3. Status message shows account details

**Fix**: Verify Edge Function returns `account_info` in response

---

## 📝 Quick Reference

**VPS IP**: `45.32.89.134`
**VPS Port**: `3001`
**API Key**: `bfa602cd4a12c93cd6a0f6cab9d93ff7b0fcd4dd2392f94e48db2013d679990d`

**Test Credentials**:
- Login: `800107112`
- Password: `Demo@123`
- Server: `ECMarketsLtd-Demo`

---

## 🎯 Next Actions

1. ✅ **Deploy VPS Service**: Run `DEPLOY_NOW_SAFE.ps1` on VPS
2. ✅ **Verify Services**: Check `pm2 list` shows both online
3. ✅ **Test Connection**: Use frontend to connect broker
4. ✅ **Monitor Logs**: Watch for any errors
5. ✅ **Verify Account Info**: Confirm account details displayed

---

**Everything is ready!** 🚀

Deploy the VPS service and test the connection now!
