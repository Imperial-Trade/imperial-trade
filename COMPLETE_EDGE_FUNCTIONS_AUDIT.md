# Complete Edge Functions Audit - Broker Sync Flow

## Summary

Analyzing which Supabase Edge Functions are actually used for the broker sync flow and identifying unused/redundant functions that can be removed.

---

## ✅ REQUIRED Edge Functions (Keep)

### Broker Sync Functions

1. **mt5-sync** ✅ REQUIRED
   - **Used By**: MQL5 EA (ImperialSync.mq5)
   - **Called**: Directly from MQL5 EA via WebRequest
   - **Purpose**: Receives trade data from MQL5 EA running in Docker
   - **Status**: ACTIVE (Version 8, deployed 2026-01-12)
   - **Action**: ✅ KEEP - This is the MAIN sync endpoint

2. **test-broker-connection** ✅ REQUIRED
   - **Used By**: Frontend (AutoJournalView.tsx line 169)
   - **Called**: `supabase.functions.invoke('test-broker-connection')`
   - **Purpose**: Tests MT5 connection before saving credentials
   - **Status**: ACTIVE (Version 52, deployed 2026-01-09)
   - **Action**: ✅ KEEP - Required for Connect Broker flow

3. **sync-broker-trades** ✅ REQUIRED
   - **Used By**: Frontend (AutoJournalView.tsx lines 242, 356, 438)
   - **Called**: `supabase.functions.invoke('sync-broker-trades')`
   - **Purpose**: Manual sync of trades (Sync Now button)
   - **Status**: ACTIVE (Version 33, deployed 2026-01-08)
   - **Action**: ✅ KEEP - Required for manual sync

4. **price-ingestor** ✅ REQUIRED (Separate but needed)
   - **Used By**: VPS Price Feeder service
   - **Purpose**: Receives price data from VPS (separate from broker sync)
   - **Status**: ACTIVE (Version 626, deployed 2025-12-01)
   - **Action**: ✅ KEEP - Needed for live prices

---

## ❓ POTENTIALLY REDUNDANT (Needs Verification)

5. **journal-ingestor** ❓ VERIFY
   - **Referenced By**: VPS auto-sync service (`vps-broker-service/src/auto-sync.ts`)
   - **Status**: ACTIVE (Version 25, deployed 2026-01-06)
   - **Purpose**: Receives trades from VPS auto-sync service
   - **Key Finding**: 
     - Auto-sync service is OPTIONAL
     - Disables gracefully if env vars not set
     - Code shows: "Auto-sync is optional. Broker connection and trade fetching will still work."
   - **Question**: Is auto-sync service actually running on VPS?
   - **If Not Running**: This function is UNUSED and can be removed
   - **Action**: ❓ VERIFY auto-sync status, then decide

6. **vps-setup-executor** ❓ VERIFY
   - **References Found**: NONE in frontend code
   - **Status**: NOT FOUND in deployed functions (grep returned empty)
   - **Purpose**: Unknown
   - **Action**: ❓ VERIFY if exists, if unused → remove

---

## Current Broker Sync Flow

### Active Flow (MQL5 EA)
```
MQL5 EA (in Docker) 
  ↓
WebRequest with x-ingest-key
  ↓
mt5-sync Edge Function
  ↓
Database (trade_journal_entries)
```

### Manual Sync Flow
```
Frontend (Sync Now button)
  ↓
sync-broker-trades Edge Function
  ↓
VPS /fetch-trades endpoint
  ↓
Database (trade_journal_entries)
```

### Connection Test Flow
```
Frontend (Connect Broker)
  ↓
test-broker-connection Edge Function
  ↓
VPS /test-connection endpoint
  ↓
Database (broker_connections - status updated)
```

### Potential Redundant Flow (Auto-Sync)
```
VPS Auto-Sync Service (optional, might be disabled)
  ↓
journal-ingestor Edge Function
  ↓
Database (trade_journal_entries)
```

**Question**: Is this auto-sync flow actually running, or is it disabled?

---

## Recommendations

### ✅ KEEP (4 functions)
- `mt5-sync` - Main sync endpoint for MQL5 EA
- `test-broker-connection` - Connection testing
- `sync-broker-trades` - Manual sync
- `price-ingestor` - Price data (separate but needed)

### ❓ VERIFY THEN DECIDE (2 functions)
- `journal-ingestor` - Check if VPS auto-sync is running
- `vps-setup-executor` - Check if exists and if used

---

## Next Steps

1. **Check VPS auto-sync status**:
   - Check VPS logs to see if auto-sync service is running
   - Check if journal-ingestor receives requests
   - If not running → Remove journal-ingestor

2. **Verify vps-setup-executor**:
   - Check if function exists in Supabase dashboard
   - Check database triggers or external systems
   - If unused → Remove

3. **Remove unused functions**:
   - After verification, remove functions that are not used
   - This will simplify the flow and reduce confusion

---

## Simplified Flow (After Cleanup)

### Broker Sync (3 Functions)
```
1. test-broker-connection (Connection testing)
2. sync-broker-trades (Manual sync)
3. mt5-sync (Automatic sync from MQL5 EA)
```

### Price Data (1 Function)
```
4. price-ingestor (Price data - separate but needed)
```

**Total: 4 functions** (if journal-ingestor is removed)
