# 🧪 Remote Testing Instructions

## 📋 **Credentials Received:**

- **Account Number:** 81071266
- **Server:** ECMarkets-MT5-Live01  
- **Trading Password:** Imperial@2026
- **Observer Password:** O*;1c.4d^#ls%F
- **Platform:** MT5
- **Broker:** EC Markets

---

## 🎯 **Testing Steps:**

### **Step 1: Create Broker Connection**

1. **Navigate to broker connection page** in the app
2. **Select "EC Markets"** as broker type
3. **Enter credentials:**
   - Account Number: `81071266`
   - Password: `Imperial@2026` (Trading Password)
   - Server: `ECMarkets-MT5-Live01`
4. **Click "Connect Broker"**

### **Step 2: Set Instant Sync Priority**

After connection is created, set `sync_priority = 1` for instant sync:

```sql
UPDATE broker_connections 
SET sync_priority = 1 
WHERE encrypted_login LIKE '%81071266%' 
  AND is_active = true;
```

Or use the frontend if there's a priority setting.

### **Step 3: Monitor System**

1. **Browser Console (F12):**
   - Check for errors
   - Look for connection/logging messages

2. **Go Brain Logs:**
   - Watch for "⚡ Fast Sync Started"
   - Check container launch messages

3. **Edge Function Logs:**
   - Check Supabase Dashboard → Functions → mt5-sync → Logs

4. **Database:**
   - Check `trade_journal_entries` for synced trades
   - Check `broker_connections.last_sync_at` updates

---

**Status:** Ready to test! 🚀
