# Connect Broker vs Sync Now Flow Verification

## Current Implementation Analysis

### Connect Broker Flow (Current)
1. User clicks "Connect Broker"
2. Frontend saves credentials to database (status: 'pending')
3. Frontend immediately calls `sync-broker-trades` Edge Function
4. Edge Function sends credentials to VPS `/fetch-trades`
5. VPS fetches trades and returns to Edge Function
6. Edge Function saves trades to database

**Issue**: No connection testing happens - it just tries to fetch trades immediately.

---

### Sync Now Flow (Current)
1. User clicks "Sync Now"
2. Frontend calls `sync-broker-trades` Edge Function
3. Edge Function sends credentials to VPS `/fetch-trades`
4. VPS fetches latest trades and returns
5. Edge Function saves trades to database

**This is correct** - Sync Now should just fetch latest trades.

---

## User's Requirement

### Connect Broker Flow (Expected)
1. User clicks "Connect Broker"
2. Supabase sends credentials to VPS (via `test-broker-connection`)
3. VPS receives credentials and tests connection
4. VPS sends reply if connected/synced
5. Supabase receives connection status and trade history
6. Supabase saves connection status and trades to database

### Sync Now Flow (Expected)
1. User clicks "Sync Now" (already connected)
2. Supabase sends credentials to VPS `/fetch-trades`
3. VPS fetches latest trade history
4. VPS returns trades to Supabase
5. Supabase saves trades to database

---

## Verification Needed

Need to check:
1. Does `test-broker-connection` Edge Function exist? ✅ YES
2. Does it send credentials to VPS? ✅ YES (sends to `/test-connection`)
3. Does VPS `/test-connection` endpoint exist? ✅ YES
4. Does VPS `/test-connection` return connection status? ✅ YES
5. Does VPS `/test-connection` return trade history? ❓ NEED TO CHECK
6. Is "Connect Broker" using `test-broker-connection`? ❌ NO - Currently just saves to DB

---

## Fix Required

"Connect Broker" should:
1. Call `test-broker-connection` Edge Function (not just save to DB)
2. `test-broker-connection` sends credentials to VPS `/test-connection`
3. VPS tests connection and returns status
4. If connected, also fetch initial trade history
5. Save connection status and trades to database
