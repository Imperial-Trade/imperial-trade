# 🔍 End-to-End Test Diagnosis

## ❌ Current Error
**"Edge Function returned a non-2xx status code"**

This indicates the Edge Function is returning an error status (400, 500, 504, etc.)

---

## 🔍 Diagnostic Steps

### 1. Check Edge Function Logs
```bash
npx supabase functions logs test-broker-connection --limit 20
```

**Look for:**
- Error messages
- VPS connection failures
- Timeout errors
- Missing secrets

### 2. Check VPS Service Status
```powershell
pm2 status
pm2 logs imperial-trade-broker-service --lines 50
```

**Look for:**
- Service is running
- Recent connection requests
- Decryption errors
- MT5 connection errors

### 3. Check MT5 Status
```powershell
Get-Process terminal64 -ErrorAction SilentlyContinue
```

**Verify:**
- MT5 is running
- MT5 is logged in (check manually on VPS)
- Connection is active (green bars in bottom-right)

### 4. Check Edge Function Secrets
```bash
npx supabase secrets list
```

**Verify:**
- `VPS_MT5_SERVICE_URL` is set
- `VPS_API_KEY` is set

### 5. Test Direct VPS Connection
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

### Issue 1: MT5 Not Logged In
**Symptom**: Connection timeout or "MT5 initialization failed"
**Fix**: Log in to MT5 manually on VPS

### Issue 2: Missing Edge Function Secrets
**Symptom**: "VPS service not configured"
**Fix**: Set secrets using `npx supabase secrets set`

### Issue 3: VPS Service Not Running
**Symptom**: Connection refused or timeout
**Fix**: Start service: `pm2 restart imperial-trade-broker-service`

### Issue 4: Decryption Error
**Symptom**: "Failed to decrypt credentials"
**Fix**: Verify `ENCRYPTION_SECRET` matches on frontend and VPS

### Issue 5: API Key Mismatch
**Symptom**: "Invalid API key"
**Fix**: Verify `VPS_API_KEY` in Edge Function matches VPS `.env`

---

## ✅ Next Steps

1. **Check Edge Function logs** for specific error
2. **Check VPS logs** for connection attempts
3. **Verify MT5 is logged in** on VPS
4. **Verify Edge Function secrets** are set
5. **Test direct VPS connection** to isolate issue

---

**Status**: ⏳ **DIAGNOSING ERROR**
