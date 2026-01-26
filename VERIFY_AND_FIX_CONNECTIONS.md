# ✅ Verify and Fix Bidirectional Connections

## Current Status

### ✅ VPS → Supabase: CONFIGURED
- VPS service is running
- Auto-sync service configured to connect to Supabase
- Configuration is in VPS `.env` file

### ❌ Edge Function → VPS: NOT WORKING
- Edge Function cannot read `VPS_MT5_SERVICE_URL` secret
- Needs verification and potential redeployment

---

## Immediate Actions Required

### 1. Verify Supabase Secrets (CRITICAL)

**Go to:** https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/settings/vault

**Verify these secrets exist with EXACT names:**
- `VPS_MT5_SERVICE_URL` = `http://45.32.89.134:3001`
- `VPS_API_KEY` = `bfa602cd4a12c93cd6a0f6cab9d93ff7b0fcd4dd2392f94e48db2013d679990d`

**Check for:**
- ✅ No extra spaces
- ✅ Case-sensitive: `VPS_MT5_SERVICE_URL` (not `vps_mt5_service_url`)
- ✅ Values are correct

### 2. Redeploy Edge Function

After verifying secrets, redeploy the Edge Function:

```bash
cd "/Users/nthny_11/Trade imperial GITHUB /nov 7 notif project/imperial-trade"
supabase login
supabase functions deploy test-broker-connection --project-ref kmuoqkcxguafxulqlbmi
```

**Expected Output:**
- Edge Function deployment successful
- Wait 30 seconds for deployment to complete

### 3. Test Connection Flow

After redeployment:

1. **Test from Frontend:**
   - Navigate to: http://localhost:8080/dashboard/journal-xx
   - Switch to "Auto Journaling (Pro)"
   - Select "EC Markets"
   - Enter credentials:
     - Login: `800107112`
     - Password: `Demo@123`
     - Server: `ECMarkets-MT5-Demo`
   - Click "Connect Broker"

2. **Check Edge Function Logs:**
   - Go to: https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/logs/explorer
   - Filter: `test-broker-connection`
   - Look for: `✅ Testing connection via VPS: http://45.32.89.134:3001`

3. **Check VPS Logs:**
   ```bash
   ssh -i ~/.ssh/vultr_vps Administrator@45.32.89.134 powershell -NoProfile -Command "pm2 logs imperial-trade-broker-service --lines 50 --nostream"
   ```
   - Look for: `📥 Received test-connection request`

---

## Verification Checklist

- [ ] Supabase secrets verified with correct names
- [ ] Edge Function redeployed
- [ ] Frontend connection test attempted
- [ ] Edge Function logs show VPS URL is set
- [ ] VPS logs show incoming connection request
- [ ] Connection succeeds or shows specific error

---

## Expected Success Flow

1. Frontend → Edge Function: ✅ POST /test-broker-connection
2. Edge Function reads secrets: ✅ VPS_MT5_SERVICE_URL is set
3. Edge Function → VPS: ✅ POST /test-connection (with API key)
4. VPS → MT5: ✅ Python script connects to MT5
5. VPS → Edge Function: ✅ Returns connection result
6. Edge Function → Frontend: ✅ Returns success/error

---

## If Still Failing

### Check Edge Function Logs:
Look for startup message:
```
🔧 Edge Function initialized: {
  vps_url_set: true,  // Should be TRUE
  vps_url_length: 29,
  vps_api_key_set: true
}
```

### Check VPS Logs:
Should show:
```
📥 Received test-connection request
🔓 Attempting to decrypt credentials...
✅ Credentials decrypted successfully
🔌 Testing MT5 connection...
```

### Common Issues:
1. **Secret not set:** Check Supabase dashboard
2. **Wrong secret name:** Must be EXACTLY `VPS_MT5_SERVICE_URL`
3. **Edge Function not redeployed:** Secrets need redeployment to pick up
4. **Network issue:** VPS firewall blocking Supabase IPs







