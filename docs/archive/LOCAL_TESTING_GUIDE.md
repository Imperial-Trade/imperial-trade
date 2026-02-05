# 🧪 Local Testing Guide - MT5 Sync System

## ✅ **System Status:**

- ✅ **Frontend:** Running on localhost:8080
- ✅ **Backend (VPS):** Go Brain running, Docker ready, Edge Function deployed
- ✅ **Database:** Supabase connected

---

## 🎯 **Testing Steps:**

### **Step 1: Verify Frontend Loads** ✅

1. **Check Browser:**
   - Open: http://localhost:8080
   - Should see your app load
   - ✅ Frontend is running

---

### **Step 2: Check Broker Connections**

1. **Navigate to Broker/Journal section**
2. **Check if you can see existing connections**
3. **Verify UI loads correctly**

---

### **Step 3: Monitor Backend (VPS)**

**In a terminal, check Go Brain logs:**
```bash
ssh root@209.222.12.247
journalctl -u imperial-brain -f
```

**Look for:**
- ✅ "Imperial Brain Online"
- ✅ "Fast Sync Started" (when containers launch)
- ✅ Container lifecycle messages

---

### **Step 4: Test Container Launch (Optional)**

If you have a broker connection ready:
1. **Set sync_priority to 1** (instant sync)
2. **Watch Go Brain logs** for container launch
3. **Check Docker containers:**
   ```bash
   docker ps | grep worker
   ```

---

### **Step 5: Verify Trade Sync**

1. **Check Edge Function logs** (Supabase Dashboard)
2. **Check database for trades:**
   ```sql
   SELECT * FROM trade_journal_entries 
   WHERE sync_source = 'mt5_docker' 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```
3. **Check frontend journal** for synced trades

---

## 🔍 **What to Look For:**

### **Success Indicators:**
- ✅ Frontend loads without errors
- ✅ Broker connections visible
- ✅ Go Brain logs show activity
- ✅ Containers launch when triggered
- ✅ Trades appear in database
- ✅ Trades display in frontend

### **Troubleshooting:**
- ❌ Frontend errors → Check browser console
- ❌ No containers → Check Go Brain logs
- ❌ No trades → Check Edge Function logs
- ❌ Database errors → Check Supabase dashboard

---

**Ready to test!** Let's verify each component! 🚀
