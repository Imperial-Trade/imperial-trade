# Repository Verification Report - Auto Journal Sync

## ⚠️ CRITICAL FINDINGS

### Files NOT in Repository (But Discussed Earlier)

The following files were mentioned in the conversation but **DO NOT EXIST** in the repository:

1. **vps-broker-service/go-brain/main.go** - Missing
   - Go Brain orchestrator service
   - Docker container management
   - Supabase polling logic

2. **vps-broker-service/go-brain/entrypoint.sh** - Missing
   - Docker entrypoint script for MT5 containers

3. **docs/ImperialSync.mq5** - Missing
   - MQL5 Expert Advisor for trade syncing
   - One-shot timer logic
   - WebRequest to Supabase

4. **Docker image** - Not built in repository
   - imperial-mt5-worker:latest (exists on VPS but not in repo)

### Database Schema Issues

The **broker_connections** table (migration 20250105_create_broker_connections.sql) is **MISSING** critical columns needed for Go Brain orchestration:

**Missing columns:**
- `sync_priority` (INTEGER) - Trigger for Go Brain to process connection
- `connection_status` (TEXT) - Track status: pending → connecting → connected → failed

**Current columns:**
- ✅ encrypted_login
- ✅ encrypted_password
- ✅ encrypted_server
- ✅ is_active
- ✅ last_sync_at
- ✅ last_error

### Edge Function Mismatch

**Current Edge Function:**
- `sync-broker-trades` (line 244 in AutoJournalView.tsx)
- Expects VPS HTTP service at `/fetch-trades`
- Pull-based architecture (frontend initiates)

**Required Edge Function (for EA-only flow):**
- `mt5-sync` - **DOES NOT EXIST**
- Receives WebRequest POST from MQL5 EA
- Push-based architecture (EA initiates)

---

## ✅ What EXISTS in Repository

### 1. Frontend Component
**File:** `src/components/journal-xx/AutoJournalView.tsx`
- ✅ Broker connection UI (XS, EC Markets, PU Prime)
- ✅ Credential encryption (AES-256-GCM)
- ✅ Saves to broker_connections table
- ✅ Calls `sync-broker-trades` Edge Function
- ✅ Displays synced trades with realtime

### 2. Database Schema
**File:** `supabase/migrations/20250105_create_broker_connections.sql`
- ✅ broker_connections table
- ✅ Encryption support (encrypted_login, encrypted_password, encrypted_server)
- ✅ RLS policies for user isolation
- ✅ trade_journal_entries columns (broker_trade_id, broker_connection_id, is_synced)

### 3. Existing Edge Function
**File:** `supabase/functions/sync-broker-trades/index.ts`
- ✅ Authenticates user
- ✅ Fetches broker connection
- ✅ Calls VPS service HTTP endpoint
- ✅ Transforms MT5 trades to journal format
- ✅ Upserts to trade_journal_entries

### 4. VPS Broker Service (Node.js)
**Directory:** `vps-broker-service/`
- ✅ Node.js + TypeScript service
- ✅ Python MetaTrader5 integration
- ✅ HTTP endpoints: /test-connection, /fetch-trades
- ✅ Encryption/decryption utilities

---

## 🔀 Architecture Mismatch

### Current Implementation (Node.js Service)
```
Frontend → sync-broker-trades → Node.js VPS Service → Python MT5 → Trades
```
- Pull-based: Frontend triggers sync
- Requires Node.js service running 24/7
- Python subprocess for each request

### Proposed Implementation (Go Brain + Docker)
```
Frontend → broker_connections → Go Brain → Docker → MT5/EA → Supabase
```
- Push-based: EA triggers sync via WebRequest
- Docker containers on-demand (90s lifetime)
- No Python dependencies

---

## 📋 Required Actions to Match Proposed Flow

### 1. Database Migration
Create migration to add missing columns:
```sql
ALTER TABLE broker_connections
  ADD COLUMN sync_priority INTEGER DEFAULT 0,
  ADD COLUMN connection_status TEXT DEFAULT 'pending';
```

### 2. Create Go Brain Service
Files needed:
- `vps-broker-service/go-brain/main.go`
- `vps-broker-service/go-brain/entrypoint.sh`
- `vps-broker-service/go-brain/Dockerfile` (if needed)

### 3. Create MQL5 EA
File needed:
- `docs/ImperialSync.mq5`
- Compile to `ImperialSync.ex5`

### 4. Create mt5-sync Edge Function
File needed:
- `supabase/functions/mt5-sync/index.ts`
- Validates x-ingest-key header
- Receives trade data from EA WebRequest

### 5. Update Frontend
Options:
a) Update to use Go Brain flow (set sync_priority)
b) Keep backward compatibility (support both flows)

### 6. Docker Configuration
Files needed:
- `vps-broker-service/Dockerfile` for imperial-mt5-worker image
- MT5 terminal + Wine setup

---

## 🎯 Recommendation

**TWO PATHS FORWARD:**

### Path A: Complete Go Brain Implementation (Recommended)
- Create missing Go Brain files
- Add database columns
- Create mt5-sync Edge Function
- Update frontend to set sync_priority
- Build Docker image
- Deploy to VPS

**Pros:**
- Better scalability (on-demand containers)
- No Python dependencies
- Faster sync
- Lower resource usage

**Cons:**
- More setup required
- Docker complexity

### Path B: Use Existing Node.js Service
- Keep current sync-broker-trades flow
- Deploy Node.js service to VPS
- No database changes needed
- Frontend already compatible

**Pros:**
- Less work
- Already functional
- Easier to debug

**Cons:**
- Python dependency
- Always-on service required
- Higher resource usage

---

## ✅ Status Summary

| Component | Status | Notes |
|-----------|--------|-------|
| Frontend | ✅ Complete | Works with sync-broker-trades |
| Database (basic) | ✅ Complete | Missing sync_priority, connection_status |
| sync-broker-trades | ✅ Complete | Needs VPS Node.js service |
| Node.js VPS Service | ✅ Complete | Not deployed |
| Go Brain | ❌ Missing | Discussed but not created |
| MQL5 EA | ❌ Missing | Discussed but not created |
| mt5-sync Edge Function | ❌ Missing | Needed for EA flow |
| Docker Image | ⚠️ Partial | Built on VPS, not in repo |

---

**CONCLUSION:**
The repository contains a working Node.js-based sync system, but the Go Brain + Docker + EA system discussed earlier **does not exist in the repository**. We need to decide which path to take and implement the missing components.
