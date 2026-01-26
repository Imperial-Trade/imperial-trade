# 🧪 Testing with Broker Credentials

## 📋 **Credentials:**

- **Account:** 81071266
- **Server:** ECMarkets-MT5-Live01
- **Password:** Imperial@2026 (Trading Password)
- **Broker:** EC Markets

---

## 🎯 **Step-by-Step Testing:**

### **Step 1: Open Browser Console**

1. Open: http://localhost:8080
2. Press **F12** (or Cmd+Option+I on Mac)
3. Click **Console** tab
4. Check for any errors or messages

---

### **Step 2: Navigate to Broker Connection**

1. Find the broker/journal section in your app
2. Look for "Connect Broker" or "Add Broker Connection"
3. Select **"EC Markets"** as broker type

---

### **Step 3: Enter Credentials**

1. **Account Number:** `81071266`
2. **Password:** `Imperial@2026`
3. **Server:** `ECMarkets-MT5-Live01`
4. Click **"Connect Broker"**

---

### **Step 4: Set Instant Sync**

After connection is created, we need to set `sync_priority = 1`:

**Option A: Via SQL (if you have access):**
```sql
UPDATE broker_connections 
SET sync_priority = 1 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com')
  AND broker_type = 'EC_MARKETS'
  AND is_active = true;
```

**Option B: Via Frontend (if available):**
- Look for a priority/sync setting
- Set to "Instant" or "Priority 1"

---

### **Step 5: Monitor System**

**A. Browser Console:**
- Watch for connection messages
- Check for errors
- Look for success/error messages

**B. Go Brain Logs:**
```bash
tail -f /tmp/go-brain-logs.log
```
- Look for: "⚡ Fast Sync Started"
- Check container ID
- Watch for container lifecycle

**C. Container Status:**
```bash
ssh root@209.222.12.247 "docker ps | grep worker"
```

**D. Database Check:**
```sql
-- Check connection created
SELECT id, broker_type, is_active, sync_priority, last_sync_at 
FROM broker_connections 
WHERE broker_type = 'EC_MARKETS' 
ORDER BY created_at DESC 
LIMIT 5;

-- Check for synced trades
SELECT * FROM trade_journal_entries 
WHERE sync_source = 'mt5_docker' 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## ✅ **Expected Results:**

1. ✅ Connection created successfully
2. ✅ Go Brain logs show container launch
3. ✅ Container runs for ~90 seconds
4. ✅ EA sends trades to Edge Function
5. ✅ Trades appear in database
6. ✅ Trades display in frontend

---

**Ready to test!** Let me know what you see in the browser console! 🚀
