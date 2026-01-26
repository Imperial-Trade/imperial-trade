# Complete Verification Guide

## How to Verify Secrets are Working

### 1. Verify Supabase Secrets are Set ✅ (Already Done)

```bash
supabase secrets list --project-ref kmuoqkcxguafxulqlbmi | grep VPS
```

**Expected Output:**
```
VPS_API_KEY            | (digest shown)
VPS_MT5_SERVICE_URL    | (digest shown)
```

**Status**: ✅ Both secrets are set

---

### 2. Verify Edge Function Can Access Secrets

**Test the Edge Function directly:**
- Go to Supabase Dashboard → Edge Functions → `sync-broker-trades`
- Check logs for: "Missing VPS configuration" errors
- If secrets are working, you should NOT see this error

---

### 3. Verify VPS Service is Running

**Current Status:**
- ❌ Node.js broker service: NOT running (port 3001 not listening)
- ✅ Go Brain service: Running (imperial-brain.service)

**Issue**: The Edge Function calls `http://209.222.12.247:3001/fetch-trades`, but there's no service listening on port 3001.

---

## Architecture Question

**The Edge Function expects:**
- A service running on port 3001
- Endpoint: `/fetch-trades`
- API Key authentication

**But the VPS only has:**
- Go Brain service (manages Docker containers)
- No Node.js service on port 3001

**This suggests either:**
1. The Node.js broker service needs to be deployed on Ubuntu VPS
2. OR Go Brain should handle the `/fetch-trades` endpoint
3. OR the architecture has changed and the Edge Function needs to call Go Brain instead

---

## Next Steps

Need to clarify:
1. What service should handle `/fetch-trades`?
2. Should we deploy the Node.js broker service on Ubuntu?
3. Or does Go Brain handle this now?
