# 🔍 Verify Secret Names in Supabase

## Critical: Secret Names Must Match Exactly

The Edge Function is looking for these **exact** secret names:

1. `VPS_MT5_SERVICE_URL` (case-sensitive)
2. `VPS_API_KEY` (case-sensitive)

## Steps to Verify

### 1. Go to Supabase Secrets Dashboard

Navigate to:
```
https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/settings/vault
```

### 2. Check Secret Names

Make sure the secrets are named **exactly**:
- ✅ `VPS_MT5_SERVICE_URL` (NOT `vps_mt5_service_url` or `VpsMt5ServiceUrl`)
- ✅ `VPS_API_KEY` (NOT `vps_api_key` or `VpsApiKey`)

### 3. Verify Secret Values

- `VPS_MT5_SERVICE_URL` should be: `http://45.32.89.134:3001`
- `VPS_API_KEY` should be: `bfa602cd4a12c93cd6a0f6cab9d93ff7b0fcd4dd2392f94e48db2013d679990d`

### 4. Check for Extra Spaces

Make sure there are no:
- Leading spaces
- Trailing spaces
- Extra characters

### 5. Common Issues

| Issue | Solution |
|-------|----------|
| Secret name has lowercase | Rename to `VPS_MT5_SERVICE_URL` (all caps) |
| Secret value has trailing space | Remove it |
| Secret not visible in list | Add it again with exact name |
| Edge Function still not reading | Wait 1-2 minutes, then redeploy function |

## After Verifying

1. If names were wrong, fix them and wait 1-2 minutes
2. Test connection again from frontend
3. Check Edge Function logs for the new diagnostic output showing secret status

## Expected Log Output (After Redeploy)

When you redeploy the function with the updated code, you should see in the logs:
```
🔧 Edge Function initialized: {
  vps_url_set: true,
  vps_url_length: 25,
  vps_api_key_set: true,
  vps_api_key_length: 64,
  all_env_keys: ['VPS_MT5_SERVICE_URL', 'VPS_API_KEY']
}
```

If you see `vps_url_set: false`, the secret is not being read.







