# 🔍 Troubleshooting Connection Error

## ❌ Current Error
**"Edge Function returned a non-2xx status code"**

This means the Edge Function is returning an error status (400, 500, 504, etc.)

---

## 🔍 Diagnostic Steps

### Step 1: Check Edge Function Logs
```bash
npx supabase functions logs test-broker-connection --limit 50
```

**Look for:**
- Error messages
- VPS connection failures
- Missing secrets
- Timeout errors

### Step 2: Verify Edge Function Secrets
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

### Step 3: Verify VPS Service is Running
```powershell
pm2 status
```

**Should show:**
- `imperial-trade-broker-service` status: `online`

**If not running:**
```powershell
pm2 restart imperial-trade-broker-service
```

### Step 4: Check VPS Port 3001
```powershell
Get-NetTCPConnection -LocalPort 3001
```

**Should show:**
- Port 3001 is listening (State: Listen)

### Step 5: Test Direct VPS Connection
```powershell
Invoke-RestMethod -Uri 'http://localhost:3001/test-connection' `
  -Method POST `
  -Headers @{
    'X-API-Key'='bfa602cd4a12c93cd6a0f6cab9d93ff7b0fcd4dd2392f94e48db2013d679990d'
    'Content-Type'='application/json'
  } `
  -Body (@{
    broker_type='ecmarkets'
    encrypted_login='dGVzdA=='
    encrypted_password='dGVzdA=='
    encrypted_server='dGVzdA=='
    user_id='test-user-id'
  } | ConvertTo-Json)
```

---

## 🚨 Common Issues

### Issue 1: Edge Function Secrets Not Set
**Error**: "VPS service not configured"
**Fix**: Set secrets using `npx supabase secrets set`

### Issue 2: VPS Service Not Running
**Error**: Connection timeout or connection refused
**Fix**: Start service: `pm2 restart imperial-trade-broker-service`

### Issue 3: VPS Port Not Accessible
**Error**: Connection refused
**Fix**: Check firewall and ensure port 3001 is open

### Issue 4: MT5 Not Logged In
**Error**: "MT5 initialization failed"
**Fix**: Log in to MT5 manually on VPS

---

## ✅ Next Steps

1. **Check Edge Function logs** for specific error
2. **Verify secrets are set** correctly
3. **Verify VPS service is running**
4. **Test direct VPS connection**
5. **Retry connection** from frontend

---

**Status**: ⏳ **DIAGNOSING**
