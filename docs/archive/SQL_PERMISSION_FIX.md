# SQL Permission Fix (If Needed)

## If You Get "Permission Denied" on View Creation

If you encounter permission errors when running the view migration, you may need to grant permissions.

### Error Scenario

**Error:** `permission denied for table broker_connections` or `must be owner of view next_sync_task`

**Cause:** Table/view owner is different from the user running the script

### Solution: Grant Permissions

Run this in Supabase SQL Editor **before** creating the view:

```sql
-- Grant usage on schema (if needed)
GRANT USAGE ON SCHEMA public TO postgres;

-- Grant permissions on broker_connections table
GRANT SELECT, UPDATE ON public.broker_connections TO postgres;

-- If view already exists, drop it first (if you have permission)
DROP VIEW IF EXISTS public.next_sync_task;

-- Then create the view (should work now)
CREATE OR REPLACE VIEW next_sync_task AS
SELECT * FROM broker_connections
WHERE is_active = true 
  AND is_syncing = false
  AND connection_status = 'pending'
ORDER BY sync_priority ASC, last_sync_at ASC NULLS FIRST
LIMIT 30;
```

### Alternative: Use Service Role

If you're using the Supabase dashboard SQL editor, you should already have the necessary permissions. The error is more likely if:
- Running via CLI with a different user
- Using a custom database user

### Verify Permissions

Check current user and permissions:
```sql
-- Check current user
SELECT current_user;

-- Check table owner
SELECT schemaname, tablename, tableowner 
FROM pg_tables 
WHERE tablename = 'broker_connections';

-- Check view owner (if exists)
SELECT schemaname, viewname, viewowner 
FROM pg_views 
WHERE viewname = 'next_sync_task';
```

---

**Note:** Most users won't encounter this. The Supabase dashboard SQL editor runs with sufficient permissions. This is primarily for custom database setups or CLI usage.
