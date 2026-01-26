# Broker Sync Edge Functions - Usage Analysis

## Edge Functions Used for Broker Sync

### ✅ ACTIVE & REQUIRED

1. **mt5-sync** ✅
   - **Used By**: MQL5 EA (ImperialSync.mq5) - sends trades directly
   - **Purpose**: Receives trade data from MQL5 EA running in Docker
   - **Authentication**: x-ingest-key header
   - **Status**: ✅ CRITICAL - Main sync endpoint for MQL5 EA
   - **Location**: `supabase/functions/mt5-sync/index.ts`

2. **test-broker-connection** ✅
   - **Used By**: Frontend (AutoJournalView.tsx line 169)
   - **Purpose**: Tests MT5 connection before saving credentials
   - **Status**: ✅ REQUIRED - Used in Connect Broker flow
   - **Location**: `supabase/functions/test-broker-connection/index.ts`

3. **sync-broker-trades** ✅
   - **Used By**: Frontend (AutoJournalView.tsx lines 242, 356, 438)
   - **Purpose**: Manual sync of trades (Sync Now button)
   - **Status**: ✅ REQUIRED - Used for manual sync
   - **Location**: `supabase/functions/sync-broker-trades/index.ts`

4. **price-ingestor** ✅
   - **Used By**: VPS Price Feeder service
   - **Purpose**: Receives price data from VPS
   - **Status**: ✅ REQUIRED - Separate from broker sync, but needed for prices
   - **Location**: `supabase/functions/price-ingestor/index.ts`

---

### ❓ POTENTIALLY UNUSED/REDUNDANT

5. **journal-ingestor** ❓
   - **Referenced By**: VPS auto-sync service (vps-broker-service/src/auto-sync.ts)
   - **Purpose**: Receives trades from VPS auto-sync
   - **Status**: ❓ NEEDS VERIFICATION
   - **Question**: Is VPS auto-sync service actually running? Or is it disabled?
   - **Note**: MQL5 EA sends directly to `mt5-sync`, so `journal-ingestor` might be redundant
   - **Location**: `supabase/functions/journal-ingestor/index.ts`

6. **vps-setup-executor** ❓
   - **Used By**: Unknown (no references found in frontend)
   - **Purpose**: VPS setup execution
   - **Status**: ❓ NEEDS VERIFICATION
   - **Question**: Is this function actually called anywhere?
   - **Location**: `supabase/functions/vps-setup-executor/index.ts`

---

## Current Flow

### Active Flow (MQL5 EA)
```
MQL5 EA (in Docker) → mt5-sync Edge Function → Database
```

### Potential Redundant Flow (Auto-Sync)
```
VPS Auto-Sync Service → journal-ingestor Edge Function → Database
```

**Question**: Is the auto-sync flow actually used, or is it disabled/redundant?

---

## Recommendations

### ✅ KEEP (Required for Broker Sync)
- `mt5-sync` - Main sync endpoint for MQL5 EA
- `test-broker-connection` - Connection testing
- `sync-broker-trades` - Manual sync
- `price-ingestor` - Price data (separate but needed)

### ❓ VERIFY BEFORE REMOVING
- `journal-ingestor` - Check if VPS auto-sync is enabled/used
- `vps-setup-executor` - Check if actually called anywhere

---

## Next Steps

1. Check if VPS auto-sync service is running
2. Check if journal-ingestor is actually receiving requests
3. Check if vps-setup-executor is called anywhere
4. Remove unused functions to simplify the flow
