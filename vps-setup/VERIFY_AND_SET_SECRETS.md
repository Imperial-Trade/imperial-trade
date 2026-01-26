# 🔐 Verify and Set Supabase Secrets

## Required Secrets

For the `test-broker-connection` Edge Function to work, these secrets must be configured:

1. **`VPS_MT5_SERVICE_URL`** = `http://45.32.89.134:3001`
2. **`VPS_API_KEY`** = (Must match the API key in VPS `.env` file)

---

## Step 1: Get VPS API Key

**On VPS, check the `.env` file:**
```powershell
# SSH to VPS
ssh Administrator@45.32.89.134

# Check VPS_API_KEY in .env file
Get-Content C:\vps-broker-service\.env | Select-String "VPS_API_KEY"
```

**Expected format:**
```
VPS_API_KEY=bfa602cd4a12c93cd6a0f6cab9d93ff7b0fcd4dd2392f94e48db2013d679990d
```

---

## Step 2: Set Secrets in Supabase

### Method A: Via Supabase Dashboard (Recommended)

1. **Go to:** https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/settings/vault

2. **Check if secrets exist:**
   - Look for `VPS_MT5_SERVICE_URL`
   - Look for `VPS_API_KEY`

3. **If missing, add them:**
   - Click "New Secret"
   - Name: `VPS_MT5_SERVICE_URL`
   - Value: `http://45.32.89.134:3001`
   - Click "Add Secret"
   
   - Click "New Secret" again
   - Name: `VPS_API_KEY`
   - Value: (Copy from VPS `.env` file)
   - Click "Add Secret"

### Method B: Via Supabase CLI

```bash
# Set VPS_MT5_SERVICE_URL
supabase secrets set VPS_MT5_SERVICE_URL="http://45.32.89.134:3001" --project-ref kmuoqkcxguafxulqlbmi

# Set VPS_API_KEY (replace with actual key from VPS .env)
supabase secrets set VPS_API_KEY="YOUR_VPS_API_KEY_HERE" --project-ref kmuoqkcxguafxulqlbmi
```

---

## Step 3: Verify Secrets Are Set

### Check Edge Function Logs

After setting secrets, the Edge Function will log secret status on startup:

1. **Go to:** https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/functions/test-broker-connection/logs

2. **Look for:**
   ```
   🔧 Edge Function initialized: {
     vps_url_set: true,
     vps_url_length: 28,
     vps_api_key_set: true,
     vps_api_key_length: 64
   }
   ```

**If you see `false` for any value, the secret is not configured correctly.**

---

## Step 4: Test Edge Function with Secrets

After setting secrets, test the Edge Function:

```bash
curl -X POST "https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/test-broker-connection" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "login": "81071266",
    "password": "test",
    "server": "ECMarkets-Demo",
    "broker": "EC Markets"
  }'
```

**Expected:**
- If secrets are set: Connection test will proceed
- If secrets are missing: Error message about missing configuration

---

## Troubleshooting

### Issue: Secrets not showing in logs

**Solution:**
1. Redeploy Edge Function after setting secrets:
   ```bash
   supabase functions deploy test-broker-connection --project-ref kmuoqkcxguafxulqlbmi
   ```

2. Wait 1-2 minutes for secrets to propagate

3. Check logs again

### Issue: Edge Function still says secrets not configured

**Solution:**
1. Double-check secret names are exactly: `VPS_MT5_SERVICE_URL` and `VPS_API_KEY`
2. Verify no extra spaces in secret values
3. Redeploy Edge Function
4. Check Supabase Dashboard → Settings → Vault to confirm secrets exist

---

## Next Steps

After verifying secrets are configured:
1. ✅ Proceed with automated VPS deployment
2. ✅ Test complete connection chain
3. ✅ Verify end-to-end functionality
