# Go Brain Status Update Requirements

## Overview

The Go Brain service must update the `connection_status` field in the `broker_connections` table to communicate progress to the frontend.

---

## Database Field

The `connection_status` field accepts these values:
- `'pending'` - Credentials saved, waiting for Go Brain to process
- `'connecting'` - Go Brain is currently attempting to connect to MT5
- `'connected'` - Connection successful, MT5 terminal is running
- `'failed'` - Connection failed, error occurred

---

## Status Update Lifecycle

### 1. Pickup Phase
**When:** Go Brain reads a row with `connection_status = 'pending'`

**Action:**
```sql
UPDATE broker_connections 
SET connection_status = 'connecting',
    updated_at = NOW()
WHERE id = connection_id AND connection_status = 'pending';
```

**Why:** This tells the frontend that Go Brain has picked up the task and is starting to process it.

---

### 2. Validation Phase
**When:** Go Brain attempts to log into MT5 with the credentials

**Action:** Status remains `'connecting'` during this phase (no update needed if already set)

**Why:** This phase may take time (Docker container startup, MT5 login, etc.)

---

### 3. Success Phase
**When:** MT5 login successful, Docker container running, EA loaded

**Action:**
```sql
UPDATE broker_connections 
SET connection_status = 'connected',
    last_sync_at = NOW(),
    last_error = NULL,
    updated_at = NOW()
WHERE id = connection_id;
```

**Why:** Frontend can now show "Connected ✅" status and expect trades to sync.

---

### 4. Failure Phase
**When:** Connection fails (invalid credentials, server error, Docker error, etc.)

**Action:**
```sql
UPDATE broker_connections 
SET connection_status = 'failed',
    last_error = 'Error message here',
    updated_at = NOW()
WHERE id = connection_id;
```

**Error Message Examples:**
- `'Invalid credentials'`
- `'Server name not found'`
- `'Docker container failed to start'`
- `'MT5 login timeout'`
- `'Network error'`

**Why:** Frontend can show the error message to the user.

---

## Implementation Notes

### Priority Queue Integration
The Go Brain already uses the `next_sync_task` view which filters by `is_active = true`. The status updates should happen:

1. **Before processing:** Update to `'connecting'`
2. **After success:** Update to `'connected'` + `last_sync_at`
3. **After failure:** Update to `'failed'` + `last_error`

### Transaction Safety
Use transactions when updating status to ensure atomicity:

```sql
BEGIN;
UPDATE broker_connections 
SET connection_status = 'connecting', updated_at = NOW()
WHERE id = connection_id AND connection_status = 'pending';
COMMIT;
```

This prevents race conditions if multiple Go Brain instances try to process the same connection.

### Error Handling
Always set `last_error` when status is `'failed'`:
- Include specific error details
- Keep error messages user-friendly (under 255 characters)
- Don't expose sensitive system details

### Status Reset
If user updates credentials, the status should be reset to `'pending'` by the frontend. Go Brain should then pick it up again.

---

## Frontend Expectations

The frontend polls every 30 seconds and expects:
- **`pending`** → Shows "Waiting for Go Brain to process..."
- **`connecting`** → Shows "Connecting to MT5..."
- **`connected`** → Shows "Connected ✅" + last sync time
- **`failed`** → Shows error message from `last_error`

---

## Testing Checklist

- [ ] Go Brain updates status to `'connecting'` when starting
- [ ] Go Brain updates status to `'connected'` on success
- [ ] Go Brain updates status to `'failed'` on error
- [ ] `last_error` is set on failures
- [ ] `last_sync_at` is set on success
- [ ] Status updates are atomic (use transactions)
- [ ] Frontend can see status changes within 30 seconds (polling interval)
