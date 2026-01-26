# 🧪 Testing MT5 Credentials and Checking for Trades

## 📋 **Credentials to Test:**

### **1. Demo Account:**
- **Account Number:** 800107112
- **Password:** Demo@123
- **Server:** ECMarkets-MT5-Demo
- **Status from Logs:** ✅ Has been tested multiple times (containers launched)

### **2. Live Account:**
- **Account Number:** 81071266
- **Password:** Imperial@2026
- **Server:** ECMarkets-MT5-Live01
- **Status from Logs:** ✅ Was tested on Jan 12

---

## 🔍 **Testing Approach:**

Since we're using the **EA-based Docker system** (not Python), we have two options:

### **Option 1: Query Database (Recommended)**
- Check if trades already exist in Supabase database
- Query `trades` table for recent trades
- Check `broker_connections` table for connection status

### **Option 2: Trigger New Test**
- Add credentials via frontend (AutoJournalView)
- Trigger sync via Go Brain
- Wait for EA to connect and send trades
- Check database for new trades

---

## 📊 **Current System Architecture:**

1. **Credentials stored:** Encrypted in `broker_connections` table
2. **Connection trigger:** Go Brain launches Docker container
3. **EA execution:** `ImperialSync.ex5` connects and syncs trades
4. **Trade storage:** Trades sent to `mt5-sync` Edge Function → Database

---

## ✅ **Next Steps:**

1. Query database for existing trades
2. If no trades found, trigger new test connection
3. Monitor container logs for trade sync
4. Report trade details to user
