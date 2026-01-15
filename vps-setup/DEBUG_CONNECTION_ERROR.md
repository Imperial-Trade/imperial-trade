# 🔍 Debugging Connection Error

## ❌ Current Error
**"Edge Function returned a non-2xx status code"**

This means the Edge Function is returning an error status (400, 500, 504, etc.)

---

## 🔍 Diagnostic Checklist

### 1. Verify MT5 is Logged In on VPS
**CRITICAL**: MT5 must be logged in before the Python script can connect.

**Check on VPS:**
- Open MT5 terminal
- Verify you see green/blue bars in bottom-right corner
- Verify account number is displayed
- If not logged in: Log in with credentials (800107112, Demo@123, ECMarketsLtd-Demo)

### 2. Verify Edge Function Secrets
```bash
npx supabase secrets list
```

**Should show:**
- `VPS_MT5_SERVICE_URL=http://45.32.89.134:3001`
- `VPS_API_KEY=bfa602cd4a12c93cd6a0f6cab9d93ff7b0fcd4dd2392f94e48db2013d679990d`

**If missing, set them:**
```bash
npx supabase secrets set VPS_MT5_SERVICE_URL=http://45.32.89.134:3001
npx supabase secrets set VPS_API_KEY=bfa602cd4a12c93cd6a0f6cab9d93ff7b0fcd4dd2392f94e48db2013d679990d
```

### 3. Verify VPS Service is Running
```powershell
pm2 status
```

**Should show:**
- `imperial-trade-broker-service` status: `online`

**If not running:**
```powershell
pm2 restart imperial-trade-broker-service
```

### 4. Check VPS Logs
```powershell
pm2 logs imperial-trade-broker-service --lines 50
```

**Look for:**
- Recent connection requests
- Decryption errors
- MT5 connection errors
- Python script errors

### 5. Check Edge Function Logs
```bash
npx supabase functions logs test-broker-connection --limit 30
```

**Look for:**
- VPS connection errors
- Timeout errors
- Missing secrets errors

---

## 🚨 Most Common Issues

### Issue 1: MT5 Not Logged In
**Error**: "MT5 initialization failed" or "Terminal not found"
**Fix**: Log in to MT5 manually on VPS

### Issue 2: Edge Function Secrets Not Set
**Error**: "VPS service not configured"
**Fix**: Set secrets using `npx supabase secrets set`

### Issue 3: VPS Service Not Running
**Error**: Connection timeout or connection refused
**Fix**: Start service: `pm2 restart imperial-trade-broker-service`

### Issue 4: Decryption Error
**Error**: "Failed to decrypt credentials"
**Fix**: Verify `ENCRYPTION_SECRET` matches on frontend and VPS

---

## ✅ Next Steps

1. **Verify MT5 is logged in** on VPS (most likely issue)
2. **Check Edge Function logs** for specific error
3. **Check VPS logs** for connection attempts
4. **Verify secrets are set** correctly
5. **Retry connection** from frontend

---

**Status**: ⏳ **DIAGNOSING**
