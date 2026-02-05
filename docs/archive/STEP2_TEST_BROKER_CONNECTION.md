# Step 2: Test Broker Connection - Complete Guide

## ✅ Pre-Flight Checklist

### 1. VPS Service Status ✅
- **Service**: `imperial-broker-service` is **ONLINE**
- **Health**: `http://209.222.12.247:3001/health` returns OK
- **Uptime**: Running and stable

### 2. MT5 Configuration ✅
- **WebRequest URL**: Already configured in `common.ini`
- **URL**: `https://kmuoqkcxguafxulqlbmi.supabase.co`
- **Status**: Ready for EA to send data

### 3. Edge Function Configuration
- **Function**: `test-broker-connection`
- **VPS URL**: Should be `http://209.222.12.247:3001`
- **API Key**: Should be set in Supabase secrets

## 📋 Testing Steps

### Step 1: Verify Supabase Secrets
1. Go to Supabase Dashboard
2. Navigate to: **Settings → Vault → Secrets**
3. Verify these secrets are set:
   - `VPS_MT5_SERVICE_URL` = `http://209.222.12.247:3001`
   - `VPS_API_KEY` = (your API key)
   - `ENCRYPTION_SECRET` = (your encryption secret)

### Step 2: Test from Frontend
1. **Open your app**: `localhost:8080` or `tradeimperial.com`
2. **Navigate to**: Journal XX Pro → Connect Broker
3. **Enter credentials**:
   - **Broker**: EC Markets
   - **Login**: 81071266
   - **Password**: Imperial@2026
   - **Server**: ECMarkets-MT5-Live01
4. **Click**: "Connect Broker"
5. **Watch console** for logs

### Step 3: Expected Flow

```
Frontend (AutoJournalView.tsx)
  ↓
  Calls: test-broker-connection Edge Function
  ↓
  Edge Function (test-broker-connection/index.ts)
  ↓
  Calls: VPS /test-connection endpoint
  ↓
  VPS (imperial-broker-service)
  ↓
  Executes: Python test_connection.py
  ↓
  Connects to: MT5 via Wine
  ↓
  Returns: Connection status + account info
  ↓
  Edge Function saves to: broker_connections table
  ↓
  Frontend shows: "Connected" status
```

## 🔍 What to Check

### Console Logs (Frontend)
- ✅ "Testing connection via test-broker-connection Edge Function"
- ✅ "Connection test successful"
- ✅ "Saving credentials to database"
- ✅ "Auto-syncing trades..."

### Edge Function Logs (Supabase)
- Check: **Edge Functions → test-broker-connection → Logs**
- Look for:
  - ✅ "VPS response received"
  - ✅ "Connection verified"
  - ❌ Any error messages

### VPS Logs
```bash
ssh vultr-vps "pm2 logs imperial-broker-service --lines 50"
```

Look for:
- ✅ "Testing MT5 connection"
- ✅ "MT5 initialized successfully"
- ✅ "Login successful"
- ❌ Any Python errors

## 🐛 Troubleshooting

### Error: "VPS service not configured"
- **Fix**: Set `VPS_MT5_SERVICE_URL` and `VPS_API_KEY` in Supabase secrets

### Error: "Connection timeout"
- **Check**: VPS is accessible: `curl http://209.222.12.247:3001/health`
- **Check**: MT5 is installed and accessible on VPS
- **Check**: Firewall allows port 3001

### Error: "Login failed"
- **Verify**: Credentials are correct
- **Verify**: Server name matches exactly (case-sensitive)
- **Check**: VPS logs for detailed error

### Error: "MT5 initialization failed"
- **Check**: MT5 path is correct: `/root/imperial-factory/mt5-master/terminal64.exe`
- **Check**: Wine is properly configured
- **Check**: Python MetaTrader5 library is installed

## ✅ Success Indicators

1. **Frontend**: Shows "Connected" status
2. **Database**: `broker_connections` table has new row with `connection_status='connected'`
3. **VPS Logs**: Show successful login
4. **Edge Function Logs**: Show successful connection

## 📋 Next Steps After Successful Connection

1. **Auto-sync**: Trades should automatically sync
2. **Realtime**: Connection status updates via Supabase Realtime
3. **EA Testing**: Attach EA to MT5 chart for real-time sync
