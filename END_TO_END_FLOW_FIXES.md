# End-to-End Credential Flow Fixes

## Issues Found and Fixed

### Issue 1: `next_sync_task` view doesn't filter by `connection_status = 'pending'`
**Problem:** The view was picking up all active connections, not just pending ones.

**Fix:** Created migration `20250114000001_fix_next_sync_task_view.sql` to add filter:
```sql
WHERE is_active = true 
  AND is_syncing = false
  AND connection_status = 'pending'  -- Only pick up pending connections
```

### Issue 2: Go Brain doesn't update `connection_status`
**Problem:** Go Brain only updated `is_syncing`, not `connection_status`, so frontend couldn't see status changes.

**Fixes Applied:**
1. **When picking up connection:** Set `connection_status = 'connecting'`
   ```go
   UPDATE broker_connections SET is_syncing = true, connection_status = 'connecting' WHERE id = $1
   ```

2. **On container creation failure:** Set `connection_status = 'failed'` + `last_error`
   ```go
   UPDATE broker_connections SET is_syncing = false, connection_status = 'failed', last_error = $2 WHERE id = $1
   ```

3. **On container start failure:** Set `connection_status = 'failed'` + `last_error`
   ```go
   UPDATE broker_connections SET is_syncing = false, connection_status = 'failed', last_error = $2 WHERE id = $1
   ```

### Issue 3: `mt5-sync` Edge Function doesn't update `connection_status`
**Problem:** When trades are successfully synced, status wasn't updated to 'connected'.

**Fix:** Updated `mt5-sync/index.ts` to set `connection_status = 'connected'` on success:
```typescript
.update({ 
  last_sync_at: new Date().toISOString(),
  connection_status: 'connected',  // ✅ Added
  is_syncing: false,
  last_error: null,
})
```

---

## Complete Flow (After Fixes)

1. **Frontend saves credentials:**
   - Sets `connection_status = 'pending'`
   - Frontend shows: "Waiting for Go Brain to process..."

2. **Go Brain picks up connection:**
   - Queries `next_sync_task` view (only returns `status = 'pending'`)
   - Sets `connection_status = 'connecting'`
   - Frontend shows: "Connecting to MT5..."

3. **Go Brain launches Docker container:**
   - Creates container with MT5 + EA
   - If failure: Sets `connection_status = 'failed'` + `last_error`
   - Frontend shows: Error message

4. **MT5 EA sends trades to mt5-sync:**
   - Edge Function receives trades
   - Sets `connection_status = 'connected'` + `last_sync_at`
   - Frontend shows: "Connected ✅"

---

## Files Modified

1. ✅ `supabase/migrations/20250114000001_fix_next_sync_task_view.sql` - View filter fix
2. ✅ `vps-broker-service/go-brain/main.go` - Status updates on pickup and failures
3. ✅ `supabase/functions/mt5-sync/index.ts` - Status update on success

---

## Next Steps

1. **Apply migration:** Run `20250114000001_fix_next_sync_task_view.sql` in Supabase
2. **Rebuild Go Brain:** Recompile and restart Go Brain service
3. **Redeploy Edge Function:** Deploy updated `mt5-sync` function
4. **Test flow:** Save credentials → Verify status updates

---

**Status:** ✅ All fixes applied - Ready for deployment and testing
