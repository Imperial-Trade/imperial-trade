# Edge Functions Cleanup Summary - Broker Sync Flow

## ✅ REQUIRED Edge Functions (Keep These)

### For Broker Sync Flow

1. **mt5-sync** ✅ KEEP
   - **Used By**: MQL5 EA (ImperialSync.mq5)
   - **Status**: ACTIVE (Version 8)
   - **Purpose**: Receives trades from MQL5 EA
   - **Why Keep**: Main sync endpoint - MQL5 EA sends trades here

2. **test-broker-connection** ✅ KEEP
   - **Used By**: Frontend (AutoJournalView.tsx)
   - **Status**: ACTIVE (Version 52)
   - **Purpose**: Tests MT5 connection before saving credentials
   - **Why Keep**: Required for Connect Broker flow

3. **sync-broker-trades** ✅ KEEP
   - **Used By**: Frontend (AutoJournalView.tsx)
   - **Status**: ACTIVE (Version 33)
   - **Purpose**: Manual sync (Sync Now button)
   - **Why Keep**: Required for manual sync functionality

### For Price Data (Separate but needed)

4. **price-ingestor** ✅ KEEP
   - **Used By**: VPS Price Feeder service
   - **Status**: ACTIVE (Version 626)
   - **Purpose**: Receives price data from VPS
   - **Why Keep**: Needed for live price updates

---

## ❓ POTENTIALLY UNUSED (Verify Then Remove)

5. **journal-ingestor** ❓ VERIFY THEN REMOVE
   - **Referenced By**: VPS auto-sync service (optional)
   - **Status**: ACTIVE (Version 25)
   - **Purpose**: Receives trades from VPS auto-sync
   - **Issue**: 
     - Auto-sync service is OPTIONAL
     - Code says: "Auto-sync is optional. Broker connection and trade fetching will still work."
     - MQL5 EA sends directly to `mt5-sync`, so this might be redundant
   - **Action**: ✅ VERIFY if auto-sync is running, if not → REMOVE

6. **vps-setup-executor** ❓ VERIFY THEN REMOVE
   - **References**: NONE found in codebase
   - **Status**: NOT FOUND in deployed functions
   - **Action**: ✅ If exists → REMOVE (no references found)

---

## Simplified Flow (After Cleanup)

### Broker Sync (3 Functions)
```
1. test-broker-connection → Tests connection
2. sync-broker-trades → Manual sync
3. mt5-sync → Automatic sync (MQL5 EA)
```

### Price Data (1 Function)
```
4. price-ingestor → Price updates
```

**Total: 4 functions** (if journal-ingestor is removed)

---

## Action Items

1. ✅ **Verify auto-sync status on VPS**
   - Check if auto-sync service is running
   - If not running → journal-ingestor is unused → REMOVE

2. ✅ **Check vps-setup-executor**
   - Already verified: NOT in deployed functions list
   - No references in code
   - If exists locally → REMOVE from codebase

3. ✅ **Remove unused functions**
   - After verification, remove journal-ingestor if auto-sync is not running
   - This simplifies the flow and reduces confusion

---

## Current Status

**Required Functions: 4**
- mt5-sync ✅
- test-broker-connection ✅
- sync-broker-trades ✅
- price-ingestor ✅

**Potentially Unused: 1-2**
- journal-ingestor ❓ (verify auto-sync status)
- vps-setup-executor ❓ (not found in deployment, no references)
