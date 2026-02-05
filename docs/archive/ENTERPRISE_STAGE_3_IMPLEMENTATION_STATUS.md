# Enterprise Stage 3 - Implementation Status

## ✅ Files Created

### 1. Database Migration
- **File:** `supabase/migrations/20250115_add_sync_priority_queue.sql`
- **Status:** ✅ Created
- **Next Step:** Run this SQL in Supabase SQL Editor:
  - Go to: https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/sql/new
  - Copy contents of the migration file
  - Paste and click "Run"

### 2. Edge Function
- **File:** `supabase/functions/mt5-sync/index.ts`
- **Status:** ✅ Created
- **Next Step:** Deploy to Supabase:
  ```bash
  supabase functions deploy mt5-sync --project-ref kmuoqkcxguafxulqlbmi
  ```

### 3. Reference Files (for VPS setup)
- **MQL5 EA:** `docs/ImperialSync.mq5` - Compile on Mac, upload to VPS
- **Dockerfile:** `docs/Dockerfile.imperial-mt5-worker` - Copy to VPS at `/root/imperial-factory/mt5-master/Dockerfile`
- **Go Brain Template:** `docs/go-brain-main.go.template` - Use with Cursor AI Composer
- **Systemd Service:** `docs/imperial-brain.service` - Copy to `/etc/systemd/system/` on VPS

---

## 📋 Next Steps (In Order)

### Step 1: Database Migration ✅ READY
1. Open: https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/sql/new
2. Copy contents of `supabase/migrations/20250115_add_sync_priority_queue.sql`
3. Paste and click "Run"
4. Verify: Check that columns `sync_priority`, `last_ping`, and `is_syncing` exist in `broker_connections` table

### Step 2: Deploy Edge Function ✅ READY
```bash
cd "/Users/nthny_11/Trade imperial GITHUB /nov 7 notif project/imperial-trade"
supabase functions deploy mt5-sync --project-ref kmuoqkcxguafxulqlbmi
```

Then set the secret:
```bash
supabase secrets set INGEST_SECRET=Imperial_Secret_2026 --project-ref kmuoqkcxguafxulqlbmi
```

### Step 3: VPS Foundation Setup
SSH into your VPS and run the one-click setup from Phase 2 of the plan.

### Step 4: Build Docker Image
On VPS, create the Dockerfile and build the `imperial-worker` image.

### Step 5: Go Brain Implementation
Use Cursor AI Composer (Cmd+I) with the prompt from the "Critical Implementation Notes" section of the plan.

---

## 🎯 Deployment Checklist

- [ ] SQL migration applied to Supabase
- [ ] `mt5-sync` Edge Function deployed
- [ ] `INGEST_SECRET` set in Supabase secrets
- [ ] VPS foundation setup completed (Docker, Go, Wine, Xvfb installed)
- [ ] Docker image `imperial-worker` built successfully
- [ ] Go Brain code implemented and compiled
- [ ] Systemd service created and enabled
- [ ] MQL5 EA compiled and uploaded to VPS
- [ ] End-to-end test completed

---

## 📝 Important Notes

1. The Go Brain implementation needs credential decryption logic (convert from TypeScript `vps-broker-service/src/encryption.ts`)
2. The MQL5 EA needs to be compiled on Mac using MetaEditor
3. All VPS setup commands are in the implementation plan
4. The Edge Function is ready to deploy once the database migration is applied
