# Edge Functions Cleanup Plan

## Current Broker Sync Edge Functions

### ✅ ACTIVE & REQUIRED (Keep)

1. **mt5-sync** ✅ KEEP
   - **Used By**: MQL5 EA (ImperialSync.mq5) - sends trades directly
   - **Status**: ACTIVE (Version 8, deployed 2026-01-12)
   - **Purpose**: Main sync endpoint - receives trades from MQL5 EA
   - **Action**: ✅ KEEP

2. **test-broker-connection** ✅ KEEP
   - **Used By**: Frontend (AutoJournalView.tsx)
   - **Status**: ACTIVE (Version 52, deployed 2026-01-09)
   - **Purpose**: Tests MT5 connection before saving credentials
   - **Action**: ✅ KEEP

3. **sync-broker-trades** ✅ KEEP
   - **Used By**: Frontend (AutoJournalView.tsx)
   - **Status**: ACTIVE (Version 33, deployed 2026-01-08)
   - **Purpose**: Manual sync of trades (Sync Now button)
   - **Action**: ✅ KEEP

4. **price-ingestor** ✅ KEEP
   - **Used By**: VPS Price Feeder service
   - **Status**: ACTIVE (Version 626, deployed 2025-12-01)
   - **Purpose**: Receives price data from VPS
   - **Action**: ✅ KEEP (separate from broker sync but needed)

---

### ❓ POTENTIALLY UNUSED (Verify & Consider Removing)

5. **journal-ingestor** ❓ VERIFY
   - **Referenced By**: VPS auto-sync service (vps-broker-service/src/auto-sync.ts)
   - **Status**: ACTIVE (Version 25, deployed 2026-01-06)
   - **Purpose**: Receives trades from VPS auto-sync service
   - **Note**: Auto-sync service is OPTIONAL and disables gracefully if env vars not set
   - **Question**: Is auto-sync service actually running? If not, this function is unused
   - **Action**: ❓ VERIFY if auto-sync is running, then decide

6. **vps-setup-executor** ❓ VERIFY
   - **Used By**: NO REFERENCES FOUND in frontend code
   - **Status**: NOT FOUND in deployed functions list
   - **Purpose**: Unknown
   - **Action**: ❓ VERIFY if exists and if used, if not - can be removed

---

## Recommended Actions

### Step 1: Verify Auto-Sync Status
- Check VPS logs to see if auto-sync service is running
- Check if journal-ingestor receives any requests
- If auto-sync is disabled/not running → journal-ingestor can be removed

### Step 2: Check vps-setup-executor
- Verify if function exists in Supabase
- Check if it's called anywhere (database triggers, external systems)
- If unused → can be removed

### Step 3: Remove Unused Functions
- After verification, remove unused functions to simplify the flow

---

## Simplified Flow (After Cleanup)

### Broker Sync Flow (Keep These)
```
1. Connect Broker:
   Frontend → test-broker-connection → VPS → Database

2. Manual Sync:
   Frontend → sync-broker-trades → VPS → Database

3. Automatic Sync:
   MQL5 EA → mt5-sync → Database
```

### Price Flow (Separate)
```
VPS Price Feeder → price-ingestor → Database
```

---

## Summary

**Keep (4 functions):**
- ✅ mt5-sync
- ✅ test-broker-connection
- ✅ sync-broker-trades
- ✅ price-ingestor

**Verify & Possibly Remove (2 functions):**
- ❓ journal-ingestor (if auto-sync not running)
- ❓ vps-setup-executor (if unused)
