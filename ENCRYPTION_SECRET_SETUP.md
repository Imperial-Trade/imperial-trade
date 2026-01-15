# ENCRYPTION_SECRET Setup Guide

## Critical Requirement

The `mt5-sync` Edge Function **requires** the `ENCRYPTION_SECRET` environment variable to decrypt credentials for account matching. Without this, the function will crash when trying to decrypt.

---

## Current Secret Value

**Default value used across the system:**
```
ImperialTrade_BrokerEncryption_2025_v1
```

This value is used in:
- ✅ Frontend: `src/utils/encryption.ts` (default)
- ✅ Go Brain: `vps-broker-service/go-brain/main.go` (constant)
- ✅ Edge Function: `supabase/functions/_shared/decrypt.ts` (default)

---

## Setting the Secret in Supabase

### Method 1: Supabase CLI (Recommended)

```bash
# 1. Navigate to project root
cd "/Users/nthny_11/Trade imperial GITHUB /nov 7 notif project/imperial-trade"

# 2. Login to Supabase (if not already logged in)
supabase login

# 3. Link to your project (if not already linked)
supabase link --project-ref kmuoqkcxguafxulqlbmi

# 4. Set the encryption secret
supabase secrets set ENCRYPTION_SECRET="ImperialTrade_BrokerEncryption_2025_v1"

# 5. Verify it's set
supabase secrets list
```

### Method 2: Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi
2. Navigate to: **Settings** → **Edge Functions** → **Secrets**
3. Add new secret:
   - **Name:** `ENCRYPTION_SECRET`
   - **Value:** `ImperialTrade_BrokerEncryption_2025_v1`
4. Click **Save**

---

## Verification

After setting the secret, verify it's accessible:

1. Check Supabase CLI:
   ```bash
   supabase secrets list
   ```
   Should show: `ENCRYPTION_SECRET`

2. Test Edge Function:
   - Deploy `mt5-sync` function
   - Check function logs for decryption errors
   - If secret is missing, you'll see: `Failed to decrypt credential`

---

## Security Notes

- ✅ **Secret is secure:** Only accessible to Edge Functions (not exposed to clients)
- ✅ **Matches system-wide:** Same secret used in Frontend, Go Brain, and Edge Functions
- ⚠️ **For production:** After testing, change to a random 32-character string
- ⚠️ **Warning:** Changing the secret will require users to re-enter broker credentials
- ⚠️ **Never commit:** Don't hardcode secrets in code (use environment variables)

### Post-Testing Security Enhancement

**After Step 7 (Handshake Test) passes:**
1. Generate new secure secret: `openssl rand -hex 32`
2. Update in all three locations:
   - Supabase: `supabase secrets set ENCRYPTION_SECRET="new-random-string"`
   - Go Brain: Update constant in `main.go` (requires rebuild)
   - Frontend: Update `VITE_ENCRYPTION_SECRET` env var (optional, can use default)
3. **Important:** Existing users will need to re-enter credentials (old encrypted data won't decrypt)

---

## Troubleshooting

### Error: "Failed to decrypt credential"
**Cause:** `ENCRYPTION_SECRET` not set or incorrect value
**Solution:** Set secret using Method 1 or Method 2 above

### Error: "Secret not found"
**Cause:** Secret name mismatch or not set
**Solution:** Verify secret name is exactly `ENCRYPTION_SECRET` (case-sensitive)

### Error: "Decryption failed"
**Cause:** Secret value doesn't match Frontend/Go Brain
**Solution:** Ensure all three locations use the same secret value

---

## Future Optimization

For better performance at scale (10,000+ users), consider:
- Add `login_hash` column to `broker_connections` table
- Store SHA-256 hash of login ID (non-reversible but searchable)
- Query by hash: `.eq('login_hash', hashed_account)` → O(1) lookup instead of O(N)

---

**Status:** ✅ Required for Edge Function deployment
**Action:** Set before deploying `mt5-sync` function (Step 3 in deployment checklist)
