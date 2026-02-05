# 🔍 Frontend Testing - Error Diagnosis

## ✅ **What I CAN See When Testing via Frontend:**

### **1. Database Status (Most Important)**

I can check the database to see:
- Connection status (`connection_status`)
- Errors (`last_error` field)
- Sync status (`is_syncing`, `last_sync_at`)
- Trade count

**Query to check errors:**
```sql
SELECT 
  id,
  connection_status,
  last_error,
  last_sync_at,
  is_syncing,
  last_ping,
  created_at
FROM broker_connections
WHERE user_id = '<user_id>'
ORDER BY created_at DESC
LIMIT 1;
```

### **2. Frontend Errors**

- Browser console errors
- UI error messages
- Toast notifications
- Connection status in UI

### **3. Trade Data**

- Number of trades synced
- Trade data in `trade_journal_entries`
- `sync_source = 'mt5_docker'` (confirms EA worked)

---

## ❌ **What I CANNOT See Directly:**

### **1. VPS Container Logs**
- Docker container logs (on VPS)
- Go Brain service logs (on VPS)
- EA output messages (in container logs)

**You need to check these on VPS:**
```bash
# Container logs
docker logs <container_id> --tail 100

# Go Brain logs
journalctl -u imperial-brain -f --tail 100
```

### **2. Edge Function Logs**
- Supabase Edge Function logs (in Supabase Dashboard)
- `mt5-sync` function logs
- Request/response details

**You need to check:**
- Supabase Dashboard → Edge Functions → `mt5-sync` → Logs

---

## 🔍 **Error Diagnosis Workflow:**

### **Step 1: Check Database (I can help with this)**

```sql
SELECT 
  connection_status,
  last_error,
  last_sync_at,
  is_syncing
FROM broker_connections
WHERE id = '<connection_id>';
```

**Common errors in `last_error`:**
- Connection failures
- Authentication errors
- Docker container errors
- Sync failures

### **Step 2: Check Frontend UI**

- Connection status display
- Error messages shown to user
- Trade count (or lack of trades)

### **Step 3: Check VPS (You need to check)**

```bash
# Go Brain logs
journalctl -u imperial-brain -f --tail 100

# Container logs
docker ps
docker logs <container_id> --tail 100
```

### **Step 4: Check Edge Function Logs (Supabase Dashboard)**

- Navigate to Edge Functions → `mt5-sync`
- Check logs for errors
- See requests from EA

---

## ✅ **What I CAN Help With:**

1. ✅ **Query database** to check connection status and errors
2. ✅ **Analyze error messages** from `last_error` field
3. ✅ **Check trade sync status** (trades synced or not)
4. ✅ **Guide you** on what to check on VPS
5. ✅ **Interpret results** and suggest fixes

---

## 🔧 **Recommended Testing Flow:**

1. **Test via frontend** (connect broker)
2. **Share results with me:**
   - Connection status from UI
   - Any error messages
   - Trade count (if any)
3. **I check database:**
   - Query `broker_connections` for errors
   - Check `trade_journal_entries` for synced trades
4. **If errors found:**
   - I'll tell you what to check on VPS
   - Guide you to check container/Go Brain logs
   - Help interpret Edge Function logs

---

## 📋 **Summary:**

| Information | Can I See? | How? |
|------------|------------|------|
| Database status/errors | ✅ YES | SQL queries |
| Frontend errors | ✅ YES | You share screenshots/errors |
| VPS container logs | ❌ NO | You check on VPS |
| Go Brain logs | ❌ NO | You check on VPS |
| Edge Function logs | ❌ NO | You check Supabase Dashboard |
| Trade sync results | ✅ YES | Database queries |

---

**So yes, I can see database errors and help diagnose issues! You just need to check VPS logs if needed.**
