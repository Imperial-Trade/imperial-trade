# ✅ How Frontend Sees Connection Status

## Good News: Infrastructure Already Exists!

### Database Fields (Already Exist)
- ✅ `last_error` TEXT - For error messages
- ✅ `last_sync_at` TIMESTAMP - Updated when trades sync
- ✅ `last_ping` TIMESTAMP - Updated by MQL5 EA heartbeat
- ✅ `is_active` BOOLEAN - Connection status

### Frontend Implementation (Already Exists)

**1. Polling (AutoJournalView.tsx line 422-427):**
```typescript
useEffect(() => {
  if (!user) return;
  
  const interval = setInterval(() => {
    fetchBrokerConnection(); // Polls every 30 seconds
  }, 30000);
  
  return () => clearInterval(interval);
}, [user, fetchBrokerConnection]);
```

**2. Status Reading (AutoJournalView.tsx line 255-310):**
```typescript
fetchBrokerConnection() {
  // Reads: last_sync_at, last_error
  if (data.last_error) {
    setError(data.last_error); // Shows error
  }
  if (data.last_sync_at) {
    setLastSyncTime(...); // Shows sync time
  }
}
```

---

## How Status Works

### ✅ Success Indicator:
- `last_sync_at` exists → **Connection successful!**
- MQL5 EA sends trades → `mt5-sync` updates `last_sync_at`
- Frontend sees `last_sync_at` → Shows "Connected ✅"

### ❌ Failure Indicator:
- `last_error` exists → **Connection failed!**
- Frontend sees `last_error` → Shows error message
- **BUT:** Go Brain needs to update this field!

---

## Missing Piece

### Go Brain Needs to Update `last_error`

**When connection fails, Go Brain should:**
```sql
UPDATE broker_connections 
SET last_error = 'Invalid credentials or server name'
WHERE id = connection_id;
```

**Currently:**
- ✅ `mt5-sync` updates `last_sync_at` on success
- ❌ Go Brain doesn't update `last_error` on failure

---

## Current Status Display Logic

The frontend **already shows status**:

1. **If `last_sync_at` exists:**
   - Shows "Last sync: [time]" ✅
   - Status = Connected

2. **If `last_error` exists:**
   - Shows error message ❌
   - Status = Error

3. **If neither exists:**
   - Shows "Waiting..." ⏳
   - Status = Pending

---

## Summary

**Frontend CAN see status through:**
1. ✅ Polling every 30 seconds
2. ✅ Reading `last_sync_at` (success)
3. ✅ Reading `last_error` (failure)

**What's missing:**
- Go Brain needs to update `last_error` when connection fails
- Then frontend will automatically show the error!

---

**The frontend is already set up correctly!** 🎉
**Just need Go Brain to update `last_error` field on failures.**
