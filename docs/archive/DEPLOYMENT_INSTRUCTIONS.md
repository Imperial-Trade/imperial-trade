# Edge Function Deployment Instructions

## Status: Code Fixed, Ready to Deploy

### ✅ Completed:
1. ✅ Removed shared module dependency (inlined CORS headers)
2. ✅ Fixed code is in: `supabase/functions/test-broker-connection/index.ts`
3. ✅ Secrets verified and set in Supabase dashboard

### ⚠️ Deployment Issue:
Both MCP deployment and browser deployment are timing out due to bundle generation timeout. This might be a temporary Supabase service issue or the function size.

## Deployment Options:

### Option 1: Try Browser Deployment Again (Recommended First)
1. Navigate to: https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/functions/test-broker-connection/code
2. Copy the entire content from `supabase/functions/test-broker-connection/index.ts`
3. Paste into the browser code editor (replace all existing code)
4. Click "Deploy updates" button
5. If it times out again, wait a few minutes and retry

### Option 2: Use Supabase CLI (Most Reliable)
```bash
# Install CLI if needed
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref kmuoqkcxguafxulqlbmi

# Deploy
supabase functions deploy test-broker-connection
```

### Option 3: Wait and Retry
The timeout might be due to:
- Temporary Supabase service issues
- Function size/complexity causing bundling delays
- Network/connectivity issues

Wait 10-15 minutes and try Option 1 again.

## What Changed:
- Removed `import { corsHeaders } from '../_shared/cors.ts'`
- Added inlined CORS headers definition directly in the function
- This eliminates the shared module bundling issue

## After Deployment:
1. Test the connection flow in the app
2. Check Edge Function logs to verify secrets are being read
3. Verify VPS connection is working
