# 🚀 Deployment Ready - Final Checklist

## Architecture Verification ✅

- ✅ **Encryption Symmetry:** Go, TypeScript, Deno all use SHA-256(userID + Secret)
- ✅ **Status Lifecycle:** 4-stage (pending → connecting → connected/failed)
- ✅ **Security:** Decryption-based matching prevents account spoofing
- ✅ **Documentation:** Complete deployment guides created

---

## Quick Deployment Steps

### 1. Database Migration (Supabase SQL Editor)
- [ ] Run: `supabase/migrations/20250114000000_add_connection_status.sql`
- [ ] Run: `supabase/migrations/20250114000001_fix_next_sync_task_view.sql`
- [ ] Verify: `SELECT * FROM next_sync_task;`

### 2. Set Encryption Secret
- [ ] Run: `supabase secrets set ENCRYPTION_SECRET="ImperialTrade_BrokerEncryption_2025_v1"`
- [ ] Verify: `supabase secrets list`

### 3. Deploy Edge Function
- [ ] Run: `supabase functions deploy mt5-sync`
- [ ] Verify: `supabase functions list`

### 4. Update Go Brain (VPS)
- [ ] SSH into VPS
- [ ] Navigate to go-brain directory
- [ ] Run: `go build -o go-brain main.go`
- [ ] Run: `sudo systemctl restart go-brain`
- [ ] Verify: `sudo systemctl status go-brain`

### 5. Test Handshake
- [ ] Save credentials in frontend
- [ ] Watch database: `connection_status` changes
- [ ] Verify: pending → connecting → connected
- [ ] Check logs for errors

---

## Using Cursor to Execute

See `CURSOR_DEPLOYMENT_GUIDE.md` for step-by-step prompts to use with Cursor Composer (Cmd + I → Agent Mode).

---

## Security Reminder

**After testing passes:** Change `ENCRYPTION_SECRET` to a random 32-character string for production security.

---

## Ready to Launch! 🚀

Start with Step 1 (Database Migration) in Supabase SQL Editor.
