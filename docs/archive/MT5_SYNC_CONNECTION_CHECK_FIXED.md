# MT5 Sync Connection Check - FIXED ✅

## What Was Changed

Updated `supabase/functions/mt5-sync/index.ts` to only accept trade data from MQL5 EA if the broker connection is actually connected to VPS MT5.

### Before (Incorrect)
- Accepted trades from any active connection (`is_active = true`)
- Did not check if connection is actually connected to VPS MT5
- Could accept trades even if connection status was 'pending' or 'failed'

### After (Correct) ✅
- Only accepts trades if `connection_status = 'connected'`
- Filters connections to only include connected ones
- Returns clear error if connection is not connected
- Double-checks connection status before processing trades

---

## Changes Made

### 1. Added Connection Status Filter
**Location**: Line 75-79

**Before:**
```typescript
const { data: connections, error: connError } = await supabase
  .from('broker_connections')
  .select('id, user_id, encrypted_login')
  .eq('is_active', true)
```

**After:**
```typescript
const { data: connections, error: connError } = await supabase
  .from('broker_connections')
  .select('id, user_id, encrypted_login, connection_status')
  .eq('is_active', true)
  .eq('connection_status', 'connected')  // ✅ Only connected connections
```

### 2. Enhanced Error Messages
**Location**: Lines 85-90

- Now returns clear error message if no connected connections found
- Explains that connection must be connected to VPS MT5

### 3. Added Safety Check
**Location**: Lines 106-118

- Double-checks connection status before processing trades
- Returns 403 Forbidden if connection status is not 'connected'
- Provides clear error message explaining the issue

---

## Complete Flow (Now Correct)

```
MQL5 EA sends trade data to mt5-sync Edge Function
  ↓
Edge Function authenticates via x-ingest-key
  ↓
Edge Function queries broker_connections:
  - is_active = true
  - connection_status = 'connected'  ✅ NEW CHECK
  ↓
If no connected connections found:
  → Return 404: "Connection not found or not connected to VPS MT5"
  ↓
Find matching connection by decrypting and comparing login
  ↓
Double-check connection status (safety check):
  - If status !== 'connected':
    → Return 403: "Connection not connected to VPS MT5"
  ↓
Process and save trades
  ↓
Update connection last_sync_at and status (should already be 'connected')
```

---

## Security Benefits

1. **Prevents Invalid Data**: Only accepts trades from connections that are actually connected
2. **Clear Error Messages**: Users know exactly why trades are rejected
3. **Status Validation**: Ensures connection is in correct state before processing
4. **Safety Check**: Double-validation prevents edge cases

---

## Testing

To verify the fix:
1. Create a broker connection with `connection_status = 'pending'`
2. MQL5 EA sends trade data
3. **Expected**: Edge Function returns 404 error: "Connection not found or not connected to VPS MT5"
4. Update connection status to `'connected'`
5. MQL5 EA sends trade data again
6. **Expected**: Trades are processed and saved successfully

---

## Summary

✅ **MT5 Sync now only works if connection is connected to VPS MT5**

- Filters connections to only include `connection_status = 'connected'`
- Returns clear error if connection is not connected
- Double-checks status before processing trades
- Prevents accepting trades from inactive or failed connections
