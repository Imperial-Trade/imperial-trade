# Edge Functions and VPS Flow

## Edge Functions Used

### 1. **test-broker-connection** (Currently NOT used by frontend)
- **Purpose**: Tests MT5 connection by sending credentials to VPS
- **VPS Endpoint**: `POST /test-connection`
- **Status**: Exists but frontend doesn't call it (credentials are saved directly to DB)

### 2. **sync-broker-trades** (Used for manual trade fetching)
- **Purpose**: Fetches trade history from VPS
- **VPS Endpoint**: `POST /fetch-trades`
- **Called by**: Frontend (AutoJournalView.tsx)
- **Flow**: Frontend → Edge Function → VPS `/fetch-trades` → Database

### 3. **mt5-sync** (Receives trades from MQL5 EA)
- **Purpose**: Receives trades from MQL5 Expert Advisor running in Docker
- **Called by**: MQL5 EA (ImperialSync.mq5) running in Docker containers
- **Flow**: Go Brain → Docker → MT5 EA → Edge Function → Database
- **Note**: This is AUTOMATIC (not called by frontend)

---

## Current Architecture

### Flow 1: Automatic (Go Brain)
```
User saves credentials → Database (connection_status: 'pending')
  → Go Brain polls database
  → Creates Docker container
  → MT5 EA runs in container
  → EA sends trades → mt5-sync Edge Function
  → Database updated
```

### Flow 2: Manual Sync (Node.js Service)
```
User clicks "Sync Now"
  → sync-broker-trades Edge Function
  → VPS Node.js service (/fetch-trades)
  → Fetches trades from MT5
  → Returns to Edge Function
  → Database updated
```

---

## Checking Connection Status

**How it works:**
1. Frontend saves credentials → Database sets `connection_status: 'pending'`
2. Go Brain picks up task → Sets `connection_status: 'connecting'`
3. Connection succeeds → Sets `connection_status: 'connected'` (via mt5-sync)
4. Connection fails → Sets `connection_status: 'failed'` (via Go Brain)

**Frontend checks status via:**
- Supabase Realtime subscription (instant updates)
- Database field: `broker_connections.connection_status`

---

## Receiving Trade History

**Two methods:**

1. **Automatic (mt5-sync)**: 
   - MQL5 EA sends trades automatically
   - No frontend action needed
   - Updates database in real-time

2. **Manual (sync-broker-trades)**:
   - User clicks "Sync Now"
   - Edge Function calls VPS `/fetch-trades`
   - Returns trade history
   - Updates database

---

## Summary

| Edge Function | Purpose | VPS Endpoint | Used By |
|---------------|---------|--------------|---------|
| `test-broker-connection` | Test connection | `/test-connection` | ❌ Not used |
| `sync-broker-trades` | Fetch trades | `/fetch-trades` | ✅ Frontend |
| `mt5-sync` | Receive trades from EA | N/A (called by EA) | ✅ MQL5 EA |

---

**The system uses `sync-broker-trades` to fetch trades manually, and `mt5-sync` to receive trades automatically from the EA.**
