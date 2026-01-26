# Account Matching Verification

## Current Implementation Status

### MQL5 EA (ImperialSync.mq5)
✅ **CORRECT** - Sends account login in payload:
```cpp
string payload = "{\"account\":\""+(string)AccountInfoInteger(ACCOUNT_LOGIN)+"\",\"trades\":["+trades+"]}";
```

### Edge Function (mt5-sync/index.ts)
⚠️ **NEEDS VERIFICATION** - Current implementation uses placeholder matching:

**Current Code (lines 71-95):**
```typescript
// Get connection by account/login
// Note: account is the MT5 login number (plain text)
// We need to find the connection - for now, we'll match by decrypted login
// TODO: In production, you may need to store a mapping or pass connection_id from MQL5 EA
const { data: connections, error: connError } = await supabase
  .from('broker_connections')
  .select('id, user_id, encrypted_login')
  .eq('is_active', true)

if (connError || !connections || connections.length === 0) {
  console.error('Error fetching connections:', connError)
  return new Response('Connection lookup failed', { status: 500, headers: corsHeaders })
}

// Find connection matching account (this is a simplified lookup)
// In production, you'd decrypt and compare, or pass connection_id from EA
const connection = connections.find((c: any) => {
  // Try to match - in production, decrypt encrypted_login and compare
  return true // Placeholder - implement proper matching
})
```

## Issue

The Edge Function currently:
- ✅ Receives `account` (login number) from MQL5 EA
- ❌ Uses placeholder matching (`return true`) - matches first connection
- ❌ Doesn't decrypt `encrypted_login` to compare with `account`

## Impact

- **For single-user testing:** Works (matches first/only connection)
- **For multi-user production:** ❌ Will match wrong connection if multiple users have connections

## Solutions

### Option 1: Pass `connection_id` from MQL5 EA (Recommended)
**MQL5 EA sends:**
```cpp
string payload = "{\"connection_id\":\""+connectionId+"\",\"account\":\""+(string)AccountInfoInteger(ACCOUNT_LOGIN)+"\",\"trades\":["+trades+"]}";
```

**Edge Function:**
```typescript
const { connection_id, account, trades } = await req.json();
const { data: connection } = await supabase
  .from('broker_connections')
  .select('id, user_id')
  .eq('id', connection_id)
  .single();
```

**Requires:** Storing `connection_id` in MQL5 EA (would need to pass it via launch.ini or environment variable)

### Option 2: Decrypt and Match (Current Production Approach)
**Edge Function decrypts and compares:**
```typescript
// Decrypt encrypted_login for each connection
// Compare decrypted value with account
// Match when decrypted_login === account
```

**Requires:** Edge Function needs decryption logic (AES-256-GCM with user_id as key)

### Option 3: Store Plaintext Login Hash (Simpler)
**Store hash of login in database:**
```sql
ALTER TABLE broker_connections ADD COLUMN login_hash TEXT;
```

**Edge Function:**
```typescript
// Hash the account from EA
const accountHash = hash(account);
// Match by login_hash
```

## Recommendation

For now (testing): The placeholder works if testing with single user.

For production: Implement Option 1 (pass connection_id) or Option 2 (decrypt and match).

## Verification Steps

1. ✅ Verify MQL5 EA sends account: Check payload in WebRequest
2. ⚠️ Verify Edge Function receives account: Check logs
3. ❌ Verify Edge Function matches correctly: Currently uses placeholder
4. ⚠️ Test with multiple connections: Will fail with current implementation

---

**Status:** Current implementation works for single-user testing, but needs fix for production multi-user scenarios.
