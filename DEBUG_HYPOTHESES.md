# Debug Hypotheses: End-to-End Credential Flow

## Hypotheses

### Hypothesis A: `next_sync_task` view doesn't filter by `connection_status = 'pending'`
**Issue:** The view filters by `is_active = true AND is_syncing = false` but doesn't check `connection_status = 'pending'`. Go Brain might pick up connections that are already processed.

**Evidence needed:**
- Log when Go Brain queries `next_sync_task`
- Log the `connection_status` of rows returned
- Check if rows with status 'connected' or 'failed' are being picked up

### Hypothesis B: Go Brain doesn't update `connection_status` field
**Issue:** Go Brain only updates `is_syncing` flag, not `connection_status`. Frontend can't see status changes.

**Evidence needed:**
- Log database updates in Go Brain
- Check if `connection_status` is being updated
- Verify frontend sees status changes

### Hypothesis C: Migration not applied - `connection_status` column doesn't exist
**Issue:** The migration might not have been run, so the column doesn't exist, causing SQL errors.

**Evidence needed:**
- Log SQL errors when inserting/updating
- Check if column exists in database schema

### Hypothesis D: Frontend doesn't properly set `connection_status = 'pending'` on save
**Issue:** Frontend insert might fail or not include the field.

**Evidence needed:**
- Log the insert statement/data
- Check database after frontend save
- Verify `connection_status` is set to 'pending'

### Hypothesis E: Go Brain query selects wrong columns or view doesn't include `connection_status`
**Issue:** The `next_sync_task` view might not include `connection_status` column, or Go Brain query doesn't select it.

**Evidence needed:**
- Check view definition
- Check Go Brain SELECT query
- Verify columns being selected
