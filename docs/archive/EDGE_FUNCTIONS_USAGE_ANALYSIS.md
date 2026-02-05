# Edge Functions Usage Analysis

## Current Usage

### ✅ CRITICAL - Broker Sync Flow (Used)

1. **mt5-sync** ✅ ACTIVE
   - **Used By**: MQL5 EA (ImperialSync.mq5)
   - **Purpose**: Receives trades from MQL5 EA running in Docker containers
   - **Status**: ✅ ACTIVE - This is the MAIN sync function
   - **Location**: Called directly by MQL5 EA via WebRequest

2. **test-broker-connection** ✅ ACTIVE
   - **Used By**: Frontend (AutoJournalView.tsx)
   - **Purpose**: Tests MT5 connection before saving credentials
   - **Status**: ✅ ACTIVE - Required for Connect Broker flow

3. **sync-broker-trades** ✅ ACTIVE
   - **Used By**: Frontend (AutoJournalView.tsx)
   - **Purpose**: Manual sync of trades (Sync Now button)
   - **Status**: ✅ ACTIVE - Required for manual sync

4. **price-ingestor** ✅ ACTIVE
   - **Used By**: VPS Price Feeder service
   - **Purpose**: Receives price data from VPS
   - **Status**: ✅ ACTIVE - Required for live prices

---

### ❓ POTENTIALLY REDUNDANT

5. **journal-ingestor** ❓ QUESTIONABLE
   - **Used By**: VPS auto-sync service (vps-broker-service/src/auto-sync.ts)
   - **Purpose**: Receives trades from VPS auto-sync
   - **Status**: ❓ REDUNDANT? - VPS auto-sync might not be needed if MQL5 EA handles it
   - **Note**: The MQL5 EA sends directly to mt5-sync, so journal-ingestor might be unused

6. **vps-setup-executor** ❓ QUESTIONABLE
   - **Used By**: Unknown
   - **Purpose**: VPS setup execution
   - **Status**: ❓ NEEDS VERIFICATION

---

### ✅ OTHER ACTIVE FUNCTIONS (Not Broker Related)

- Notification functions (notify-*)
- Account management functions
- AI analysis functions
- File upload functions
- etc.

---

## Analysis: journal-ingestor

### Current Implementation
- VPS auto-sync service (`vps-broker-service/src/auto-sync.ts`) references `journal-ingestor`
- But MQL5 EA sends directly to `mt5-sync`
- These might be two different sync methods

### Questions
1. Is VPS auto-sync service actually running?
2. Is it redundant with MQL5 EA → mt5-sync flow?
3. Should journal-ingestor be removed if auto-sync is not used?

---

## Recommendation

**For Broker Sync Flow:**
- ✅ **KEEP**: `mt5-sync` (MQL5 EA sends here)
- ✅ **KEEP**: `test-broker-connection` (Frontend uses)
- ✅ **KEEP**: `sync-broker-trades` (Frontend uses)
- ❓ **VERIFY**: `journal-ingestor` (Might be unused if auto-sync is disabled)
- ❓ **VERIFY**: `vps-setup-executor` (Check if used)
