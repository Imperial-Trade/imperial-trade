# Edge Function Secrets Verification Guide

## Current Status

✅ **Secrets Added to Supabase:**
- `VPS_MT5_SERVICE_URL` = `http://45.32.89.134:3001`
- `VPS_API_KEY` = `bfa602cd4a12c93cd6a0f6cab9d93ff7b0fcd4dd2392f94e48db2013d679990d`

## Important Notes

### Secrets Propagation
- Supabase Edge Function secrets are **available immediately** after being set
- **No redeployment needed** - secrets are injected as environment variables at runtime
- However, it can take **1-5 minutes** for changes to fully propagate across all Edge Function instances

### Testing Timeline
1. ✅ Secrets added: Just now
2. ⏳ Wait 2-3 minutes for propagation
3. 🔄 Test connection again

## Debugging Steps

### If Connection Still Fails:

1. **Check Edge Function Logs:**
   - Go to: https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/logs/explorer
   - Filter by: `test-broker-connection`
   - Look for error messages

2. **Verify Secrets Are Set:**
   - Go to: https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/functions/secrets
   - Confirm both secrets are listed with correct values

3. **Check VPS Logs:**
   ```bash
   ssh -i ~/.ssh/vultr_vps Administrator@45.32.89.134 powershell -NoProfile -Command "pm2 logs imperial-trade-broker-service --lines 50 --nostream"
   ```

4. **Test VPS Directly:**
   ```bash
   curl -X POST http://45.32.89.134:3001/test-connection \
     -H "Content-Type: application/json" \
     -H "X-API-Key: bfa602cd4a12c93cd6a0f6cab9d93ff7b0fcd4dd2392f94e48db2013d679990d" \
     -d '{"broker_type":"ecmarkets","encrypted_login":"test","encrypted_password":"test","encrypted_server":"test","user_id":"test-user"}'
   ```

## Expected Flow After Secrets Are Set

1. Frontend sends encrypted credentials to Edge Function
2. Edge Function reads `VPS_MT5_SERVICE_URL` from secrets ✅
3. Edge Function calls: `http://45.32.89.134:3001/test-connection` ✅
4. Edge Function sends `X-API-Key` header with `VPS_API_KEY` ✅
5. VPS receives request and logs connection attempt
6. VPS decrypts credentials
7. VPS tests MT5 connection
8. VPS returns result to Edge Function
9. Edge Function returns result to frontend

## Current Issue

The Edge Function is not reaching the VPS, which suggests:
- Secrets may still be propagating (wait 2-3 minutes)
- Edge Function may have an error before VPS call
- Network/firewall issue preventing Edge Function → VPS connection

## Next Steps

1. ⏳ **Wait 2-3 minutes** for secrets to propagate
2. 🔄 **Test connection again** from frontend
3. 📊 **Check VPS logs** - should see connection attempts
4. 🔍 **Check Edge Function logs** if still failing







