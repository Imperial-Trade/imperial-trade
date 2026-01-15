# ✅ Credentials Persistence After Cleanup

## 🎯 **Answer:**

**Users do NOT need to re-enter credentials after cleanup!**

They can simply **hit the sync button** again - credentials are stored in the database and persist.

---

## 🔄 **How It Works:**

### **1. First Time - User Adds Credentials:**

1. User enters credentials in `BrokerLoginForm`
2. Credentials are **encrypted client-side**
3. Stored in `broker_connections` table (persists in database)
4. Container launches → Syncs trades → Cleanup

### **2. After Cleanup - User Wants to Sync Again:**

1. User clicks **"Sync" button** in `AutoJournalView`
2. Calls `sync-broker-trades` Edge Function
3. Edge Function:
   - Reads credentials from `broker_connections` table (already stored)
   - Sets `sync_priority = 1`
   - Triggers container launch via Go Brain
4. Container launches → Uses same credentials from database → Syncs trades

---

## 📋 **Key Points:**

✅ **Credentials are stored permanently** in `broker_connections` table
✅ **Encrypted** (client-side encryption before storage)
✅ **Persist after cleanup** (database record remains)
✅ **Sync button uses stored credentials** (no need to re-enter)

---

## 🔍 **Edge Function Flow:**

The `sync-broker-trades` Edge Function:
1. Gets `connection_id` from request
2. Reads credentials from `broker_connections` table (already stored)
3. Sets `sync_priority = 1` → Triggers Go Brain
4. Go Brain:
   - Reads credentials from database
   - Decrypts credentials
   - Writes to `launch.ini`
   - Launches container

---

## ✅ **Conclusion:**

**Users can just hit the sync button** - no need to re-enter credentials!

Credentials persist in the database and are automatically used for each sync.
