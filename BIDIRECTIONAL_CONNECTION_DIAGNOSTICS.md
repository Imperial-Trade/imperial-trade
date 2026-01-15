# 🔄 Bidirectional Connection Diagnostics

## Overview

This document verifies both directions of the connection:
1. **Supabase Edge Function → VPS** (for testing connections & fetching trades)
2. **VPS → Supabase** (for auto-syncing trades back)

---

## ✅ Connection Status

### 1. VPS Service (Direct Access)

**Status:** ✅ **ACCESSIBLE**

```bash
curl http://45.32.89.134:3001/health
# Response: {"status":"ok","service":"imperial-trade-broker-service"}
```

**Endpoints Available:**
- `GET /health` - Health check ✅
- `POST /test-connection` - Test MT5 connection (requires API key)
- `POST /fetch-trades` - Fetch trades from MT5 (requires API key)
- `POST /diagnostics` - Comprehensive diagnostics (requires API key)

---

### 2. Edge Function → VPS Connection

**Status:** ❌ **NOT WORKING**

**Problem:** Edge Function is returning 400 error, indicating `VPS_MT5_SERVICE_URL` is not being read from secrets.

**Evidence:**
- Edge Function logs show: `POST | 400 | test-broker-connection`
- No VPS logs showing incoming requests
- Edge Function code checks: `if (VPS_MT5_SERVICE_URL)` → Falls through to validation-only mode

**Root Cause:**
The Edge Function startup logs should show:
```javascript
🔧 Edge Function initialized: {
  vps_url_set: false,  // ← This is the problem
  vps_url_value: 'NOT SET',
  vps_api_key_set: false
}
```

**Required Fix:**
1. Verify secrets in Supabase Dashboard
2. Ensure secret names are EXACTLY: `VPS_MT5_SERVICE_URL` and `VPS_API_KEY`
3. Redeploy Edge Function if secrets were just added

---

### 3. VPS → Supabase Connection

**Status:** ✅ **CONFIGURED** (needs verification)

**Configuration:**
- VPS auto-sync service connects to:
  - **Supabase REST API:** `${SUPABASE_URL}/rest/v1/broker_connections`
  - **Journal Ingestor:** `${SUPABASE_URL}/functions/v1/journal-ingestor`

**VPS Environment Variables Required:**
- `SUPABASE_URL` - ✅ Should be: `https://kmuoqkcxguafxulqlbmi.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` - ✅ Required for REST API access
- `INGEST_SECRET` - ✅ Required for journal-ingestor authentication

**How It Works:**
1. VPS auto-sync queries Supabase for active broker connections
2. For each connection, fetches trades from MT5
3. Transforms trades and sends to `journal-ingestor` Edge Function
4. Updates `last_sync_at` timestamp in `broker_connections` table

**Verification Steps:**
1. Check VPS logs: `pm2 logs imperial-trade-broker-service`
2. Look for auto-sync startup messages
3. Check for Supabase connection errors

---

## 🔧 Fix Steps

### Step 1: Verify Supabase Secrets

1. Go to: https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/settings/vault
2. Verify secrets exist with EXACT names:
   - `VPS_MT5_SERVICE_URL` = `http://45.32.89.134:3001`
   - `VPS_API_KEY` = `bfa602cd4a12c93cd6a0f6cab9d93ff7b0fcd4dd2392f94e48db2013d679990d`

### Step 2: Redeploy Edge Function

After verifying secrets, redeploy to ensure they're picked up:

```bash
supabase functions deploy test-broker-connection --project-ref kmuoqkcxguafxulqlbmi
```

### Step 3: Test Edge Function → VPS

After redeployment, test from frontend and check:
- Edge Function logs show: `✅ Testing connection via VPS: http://45.32.89.134:3001`
- VPS logs show: `📥 Received test-connection request`

### Step 4: Verify VPS → Supabase

Check VPS auto-sync logs for:
- `✅ All environment variables present`
- `📋 Found X active broker connection(s)`
- Successful Supabase API calls

---

## 📊 Connection Flow Diagram

```
┌─────────────┐                    ┌──────────────┐
│   Frontend  │                    │   Supabase   │
│  (React)    │                    │ Edge Function│
└──────┬──────┘                    └──────┬───────┘
       │                                   │
       │ 1. POST /test-broker-connection  │
       ├──────────────────────────────────>│
       │                                   │
       │                                   │ 2. Check VPS_MT5_SERVICE_URL
       │                                   │    (from secrets)
       │                                   │
       │                                   │ 3. POST /test-connection
       │                                   ├──────────────────────────┐
       │                                   │                          │
       │                                   │                          ▼
       │                                   │                  ┌──────────────┐
       │                                   │                  │  VPS Service │
       │                                   │                  │   (Node.js)  │
       │                                   │                  └──────┬───────┘
       │                                   │                         │
       │                                   │                         │ 4. Decrypt credentials
       │                                   │                         │
       │                                   │                         │ 5. Call Python MT5 script
       │                                   │                         │
       │                                   │ 6. Return result        │
       │                                   │<─────────────────────────│
       │                                   │                         │
       │ 7. Return connection result      │                         │
       │<──────────────────────────────────│                         │
       │                                   │                         │
                                                                    │
       ┌────────────────────────────────────────────────────────────┘
       │
       │ 8. Auto-Sync (Background Loop)
       │
       │    VPS queries: GET /rest/v1/broker_connections
       │    VPS sends: POST /functions/v1/journal-ingestor
       ▼
```

---

## 🐛 Troubleshooting

### Edge Function Not Reaching VPS

**Symptoms:**
- Edge Function returns 400 error
- No VPS logs for incoming requests
- Frontend shows "Connection test failed"

**Fix:**
1. Check Edge Function startup logs for secret status
2. Verify secret names in Supabase dashboard
3. Redeploy Edge Function after adding/updating secrets

### VPS Not Syncing to Supabase

**Symptoms:**
- No trades appearing in journal
- VPS logs show connection errors

**Fix:**
1. Check VPS `.env` file has all required variables
2. Verify `SUPABASE_SERVICE_ROLE_KEY` is correct
3. Check VPS can reach Supabase REST API (firewall/network)

---

## ✅ Success Criteria

Both directions working when:
1. ✅ Edge Function can reach VPS `/test-connection` endpoint
2. ✅ VPS logs show incoming requests from Edge Function
3. ✅ VPS auto-sync can query Supabase REST API
4. ✅ VPS auto-sync can send trades to `journal-ingestor`
5. ✅ Trades appear in `trade_journal_entries` table







