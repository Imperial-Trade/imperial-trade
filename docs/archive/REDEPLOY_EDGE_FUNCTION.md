# Redeploy Edge Function Instructions

## Edge Function: `test-broker-connection`

### Status: ✅ Code Fixed, Ready to Deploy

### Changes Applied:
1. ✅ Explicit secret checks - prevents skipping VPS connection
2. ✅ Error re-throwing - no silent failures
3. ✅ 30-second timeout on VPS calls
4. ✅ Enhanced logging for debugging

### Prerequisites:
1. ✅ Supabase secrets verified in dashboard:
   - `VPS_MT5_SERVICE_URL` = `http://45.32.89.134:3001`
   - `VPS_API_KEY` = (from VPS_CONFIGURATION_VALUES.md)

### Deployment Command:

```bash
supabase functions deploy test-broker-connection --project-ref kmuoqkcxguafxulqlbmi
```

### If Supabase CLI not installed:

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Login to Supabase:
```bash
supabase login
```

3. Link to project:
```bash
supabase link --project-ref kmuoqkcxguafxulqlbmi
```

4. Deploy:
```bash
supabase functions deploy test-broker-connection
```

### Verification After Deployment:

1. Check Edge Function logs:
   - Go to: https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/functions/test-broker-connection/logs

2. Test from frontend:
   - Navigate to Journal XX Pro
   - Try connecting with MT5 credentials
   - Check browser console for logs
   - Check Edge Function logs for connection attempts

3. Expected logs should show:
   - ✅ "Testing connection via VPS: http://45.32.89.134:3001"
   - ✅ VPS response details
   - ❌ If secrets missing: Clear error message about missing secrets







