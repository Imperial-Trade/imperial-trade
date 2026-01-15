# Complete Edge Functions and VPS Flow Documentation

## Answer to Your Questions

### 1. What Edge Function sends credentials to VPS?

**Answer**: `test-broker-connection` Edge Function

- **Location**: `supabase/functions/test-broker-connection/index.ts`
- **VPS Endpoint**: `POST http://209.222.12.247:3001/test-connection`
- **Status**: ⚠️ **NOT currently used by frontend**
- **Current Behavior**: Frontend saves credentials directly to database (BrokerLoginForm.tsx)

**However**, the architecture has changed:
- Frontend now saves credentials directly to database
- Go Brain handles connections automatically
- `test-broker-connection` exists but is not called from frontend

---

### 2. How do we check if we are connected?

**Answer**: Database `connection_status` field + Supabase Realtime

**Flow:**
1. User saves credentials → Database: `connection_status: 'pending'`
2. Go Brain picks up task → Database: `connection_status: 'connecting'`
3. Connection succeeds → Database: `connection_status: 'connected'` (updated by mt5-sync)
4. Connection fails → Database: `connection_status: 'failed'` (updated by Go Brain)

**Frontend Monitoring:**
- **Realtime Subscription**: Listens to `broker_connections` table updates
- **Location**: `AutoJournalView.tsx` (lines 461-493)
- **Status Field**: `broker_connections.connection_status`

**Status Values:**
- `pending`: Waiting for Go Brain to process
- `connecting`: Go Brain is setting up Docker container
- `connected`: Successfully connected and syncing
- `failed`: Connection failed

---

### 3. How do we receive trade history in the VPS?

**Answer**: Two methods

#### Method 1: Automatic (mt5-sync Edge Function)
- **Edge Function**: `mt5-sync`
- **Called by**: MQL5 Expert Advisor (ImperialSync.mq5)
- **Flow**: 
  ```
  Go Brain → Docker Container → MT5 EA → mt5-sync Edge Function → Database
  ```
- **Automatic**: No user action needed
- **Location**: `supabase/functions/mt5-sync/index.ts`

#### Method 2: Manual Sync (sync-broker-trades Edge Function)
- **Edge Function**: `sync-broker-trades`
- **Called by**: Frontend (when user clicks "Sync Now")
- **VPS Endpoint**: `POST http://209.222.12.247:3001/fetch-trades`
- **Flow**:
  ```
  Frontend → sync-broker-trades Edge Function → VPS /fetch-trades → Database
  ```
- **Location**: `supabase/functions/sync-broker-trades/index.ts`
- **Frontend**: `AutoJournalView.tsx` (syncTrades function)

---

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ USER ACTIONS                                                │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. Save Credentials                                         │
│    Frontend → Database (connection_status: 'pending')      │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Go Brain Processes                                       │
│    Database (pending) → Go Brain → Docker Container        │
│    connection_status: 'connecting'                          │
└─────────────────────────────────────────────────────────────┘
                    │
                    ├──────────────────────────┐
                    │                          │
                    ▼                          ▼
┌──────────────────────────────┐  ┌──────────────────────────────┐
│ 3A. Automatic Trade Sync     │  │ 3B. Manual Trade Sync        │
│ (MQL5 EA → mt5-sync)         │  │ (Frontend → sync-broker-     │
│                              │  │ trades → VPS /fetch-trades)  │
│ MT5 EA runs in Docker        │  │                              │
│ Sends trades to:             │  │ User clicks "Sync Now"       │
│ /functions/v1/mt5-sync       │  │ Edge Function calls:         │
│                              │  │ VPS:3001/fetch-trades        │
│ Updates:                     │  │                              │
│ - connection_status:         │  │ Updates:                     │
│   'connected'                │  │ - last_sync_at               │
│ - last_sync_at               │  │ - trade_journal_entries      │
│ - trade_journal_entries      │  │                              │
└──────────────────────────────┘  └──────────────────────────────┘
                    │                          │
                    └──────────┬───────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Database Updated                                         │
│    trade_journal_entries table                             │
│    broker_connections table (last_sync_at, status)         │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Frontend Updates (Realtime)                              │
│    Supabase Realtime → Frontend                             │
│    Trades appear in UI                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Edge Functions Summary

| Edge Function | Purpose | VPS Endpoint | Called By | Status |
|---------------|---------|--------------|-----------|--------|
| `test-broker-connection` | Test MT5 connection | `/test-connection` | ❌ Not used | Exists but unused |
| `sync-broker-trades` | Fetch trades manually | `/fetch-trades` | ✅ Frontend | ✅ Active |
| `mt5-sync` | Receive trades from EA | N/A | ✅ MQL5 EA | ✅ Active |

---

## VPS Service Endpoints

| Endpoint | Method | Purpose | Called By |
|----------|--------|---------|-----------|
| `/health` | GET | Health check | Manual/Testing |
| `/test-connection` | POST | Test MT5 connection | test-broker-connection (unused) |
| `/fetch-trades` | POST | Fetch trade history | sync-broker-trades Edge Function |
| `/diagnostics` | POST | Connection diagnostics | Manual/Testing |

---

## Checking Connection Status

**Database Field**: `broker_connections.connection_status`

**Values:**
- `pending`: Waiting for Go Brain
- `connecting`: Go Brain is processing
- `connected`: Successfully connected
- `failed`: Connection failed

**How Frontend Checks:**
1. Realtime subscription (instant updates)
2. Database query on page load
3. Status displayed in UI

---

## Receiving Trade History

**Two Methods:**

1. **Automatic (Recommended)**:
   - Go Brain → Docker → MT5 EA → `mt5-sync` Edge Function
   - Trades appear automatically
   - No user action needed

2. **Manual Sync**:
   - User clicks "Sync Now"
   - `sync-broker-trades` Edge Function → VPS `/fetch-trades`
   - Returns trade history immediately

---

## Summary

**To send credentials to VPS:**
- ⚠️ `test-broker-connection` exists but is NOT used
- ✅ Credentials are saved to database, Go Brain handles connection

**To check if connected:**
- ✅ Database field: `connection_status`
- ✅ Frontend: Realtime subscription in AutoJournalView.tsx

**To receive trade history:**
- ✅ Automatic: `mt5-sync` Edge Function (from MQL5 EA)
- ✅ Manual: `sync-broker-trades` Edge Function (calls VPS `/fetch-trades`)
