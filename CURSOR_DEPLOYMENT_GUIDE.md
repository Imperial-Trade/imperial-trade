# Cursor Deployment Guide - Quick Start

## Using Cursor to Execute Deployment Steps

### Step 1: Database Migration (Supabase SQL Editor)

**Option A: Manual (Recommended for first-time)**
1. Open Supabase Dashboard: https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi
2. Go to: **SQL Editor** → **New Query**
3. Copy and paste SQL from: `supabase/migrations/20250114000000_add_connection_status.sql`
4. Run query
5. Then run SQL from: `supabase/migrations/20250114000001_fix_next_sync_task_view.sql`
6. Verify: Run `SELECT * FROM next_sync_task;` to check view works

**Option B: Via Cursor (If you have Supabase CLI)**
```bash
# In Cursor terminal
supabase db push
```

---

### Step 2 & 3: Supabase CLI (ENCRYPTION_SECRET + Deploy Function)

**Using Cursor Composer (Cmd + I) → Agent Mode:**

**Prompt 1 - Set Secret:**
```
I need to set the ENCRYPTION_SECRET in Supabase. 
Run: supabase secrets set ENCRYPTION_SECRET="ImperialTrade_BrokerEncryption_2025_v1"
Then verify with: supabase secrets list
```

**Prompt 2 - Deploy Function:**
```
Deploy the mt5-sync Edge Function to Supabase.
Run: supabase functions deploy mt5-sync
Verify deployment with: supabase functions list
```

---

### Step 4: Go Brain on VPS

**Using Cursor Terminal + SSH:**

1. **Open Terminal in Cursor:**
   - Terminal → New Terminal (or Cmd + `)

2. **SSH into VPS:**
   ```bash
   ssh user@your-vps-ip
   # Or if you have SSH config:
   ssh vps
   ```

3. **Once SSH'd in, use Cursor Composer:**
   ```
   I am SSH'd into my VPS. Please:
   1. Navigate to the go-brain directory (usually ~/vps-broker-service/go-brain or /root/vps-broker-service/go-brain)
   2. Rebuild the Go binary: go build -o go-brain main.go
   3. Restart the systemd service: sudo systemctl restart go-brain
   4. Verify it's running: sudo systemctl status go-brain
   ```

**Alternative: Manual VPS Commands**
```bash
cd ~/vps-broker-service/go-brain  # or your path
go build -o go-brain main.go
sudo systemctl stop go-brain
sudo systemctl start go-brain
sudo systemctl status go-brain
```

---

## Quick Command Reference

### Local (MacBook) - Supabase CLI
```bash
# Navigate to project
cd "/Users/nthny_11/Trade imperial GITHUB /nov 7 notif project/imperial-trade"

# Set encryption secret
supabase secrets set ENCRYPTION_SECRET="ImperialTrade_BrokerEncryption_2025_v1"

# Deploy Edge Function
supabase functions deploy mt5-sync

# Verify
supabase secrets list
supabase functions list
```

### Remote (VPS) - Go Brain
```bash
# Navigate to go-brain directory
cd ~/vps-broker-service/go-brain

# Rebuild binary
go build -o go-brain main.go

# Restart service
sudo systemctl restart go-brain

# Check status
sudo systemctl status go-brain

# View logs
journalctl -u go-brain -f
# OR if using log file:
tail -f go-brain.log
```

---

## Troubleshooting with Cursor

### If Supabase CLI commands fail:
**Ask Cursor:**
```
I'm getting an error with Supabase CLI. Please check:
1. Am I logged in? (supabase login)
2. Is the project linked? (supabase link --project-ref kmuoqkcxguafxulqlbmi)
3. Check the error message and suggest fixes
```

### If Go Brain build fails:
**Ask Cursor:**
```
The Go build is failing. Please:
1. Check if Go is installed (go version)
2. Check for syntax errors in main.go
3. Verify dependencies (go mod tidy)
4. Suggest fixes based on the error
```

### If permission errors in SQL:
**Ask for help** - User mentioned they can provide GRANT commands if needed.

---

## Security Note (After Testing)

Once the handshake test (Step 7) works:
- ✅ Change `ENCRYPTION_SECRET` to a random 32-character string
- ⚠️ **Warning:** Changing the secret will require users to re-enter credentials
- 🔒 Use a secure random generator: `openssl rand -hex 32`

---

## Success Criteria

After deployment, verify:
- ✅ Database migration applied (column exists, view updated)
- ✅ ENCRYPTION_SECRET set in Supabase
- ✅ Edge Function deployed
- ✅ Go Brain rebuilt and running
- ✅ Status changes: pending → connecting → connected
- ✅ No errors in logs

---

**Ready to deploy?** Start with Step 1 (Database Migration) in Supabase SQL Editor!
