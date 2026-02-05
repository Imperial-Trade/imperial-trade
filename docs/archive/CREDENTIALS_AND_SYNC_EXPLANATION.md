# ✅ Credentials & Sync After Cleanup

## 🎯 **Answer:**

**Users do NOT need to re-enter credentials after cleanup!**

They can simply **hit the sync button** - credentials are stored in the database and persist permanently.

---

## 🔄 **How Credentials Work:**

### **1. First Time Setup:**

1. User enters credentials in `BrokerLoginForm`
2. Credentials encrypted **client-side**
3. Stored in `broker_connections` table (permanent storage)
4. Container launches → Syncs trades → Cleanup

### **2. After Cleanup - Sync Again:**

**Credentials are already stored!** User can:
- Click **"Sync" button** in `AutoJournalView`
- No need to re-enter credentials
- System uses stored credentials from database

---

## 📋 **Credential Storage:**

✅ **Stored in database:** `broker_connections` table
✅ **Encrypted:** Client-side encryption (AES-256-GCM)
✅ **Permanent:** Persists after container cleanup
✅ **Reusable:** Used for every sync

---

## 🔍 **Sync Flow:**

1. **User clicks "Sync" button**
2. **Frontend calls:** `sync-broker-trades` Edge Function
3. **Edge Function:**
   - Reads credentials from `broker_connections` table (already stored)
   - Uses credentials to sync trades
4. **OR triggers Go Brain** (if using container-based sync)
   - Go Brain reads credentials from database
   - Decrypts credentials
   - Launches container with credentials

---

## ✅ **Summary:**

- ✅ **Credentials persist** in database after cleanup
- ✅ **No re-entry needed** - just hit sync button
- ✅ **Automatically reused** for each sync
- ✅ **Secure** - encrypted storage

**Users can sync anytime without re-entering credentials!**
