# 📊 Accounts & Trade Logs Summary

## **Test Date:** January 15, 2026 03:40 UTC

## ⚠️ **Current Status: Cannot Fetch Trade Logs Directly**

### **Problem:**
The MetaTrader5 Python library **cannot run on Linux directly** - it requires Windows DLLs. Trade logs must be accessed via:
1. **Supabase Database** (recommended) - EA syncs trades automatically
2. **Docker Containers** - When running, can access MT5 data
3. **MT5 Terminal Data Files** - Binary format, requires MT5 tools

## 📋 **Accounts Found on VPS:**

### **Account 1: EC Markets Demo**
- **Connection ID:** `4a269b74-38ce-4888-8b09-5f86301ec71e`
- **Login:** `800107112`
- **Password:** `Demo@123` ✅ (decrypted)
- **Server:** `ECMarketsLtd-Demo`
- **Status:** ✅ Ready for testing
- **Launch File:** `/root/imperial-factory/config/launch_4a269b74-38ce-4888-8b09-5f86301ec71e.ini`

### **Account 2: XSFintech Real**
- **Connection ID:** `c46a3b1b-6331-44c9-98fb-2df8e0db843a`
- **Login:** `11321405`
- **Password:** `U!27bc5h` ✅ (decrypted)
- **Server:** `XSFintech-REAL-3`
- **Status:** ✅ Ready for testing
- **Launch File:** `/root/imperial-factory/config/launch_c46a3b1b-6331-44c9-98fb-2df8e0db843a.ini`

### **Account 3: PUPrime Live**
- **Connection ID:** `ef59770a-87c0-478d-8296-829469394bc1`
- **Login:** `18448879`
- **Password:** `wb6V8e^t` ✅ (decrypted)
- **Server:** `PUPrime-Live 4`
- **Status:** ✅ Ready for testing
- **Launch File:** `/root/imperial-factory/config/launch_ef59770a-87c0-478d-8296-829469394bc1.ini`

### **Account 4: Encrypted (Cannot Access)**
- **Connection ID:** `5d439579-31f4-494e-865d-169166fc1c7a`
- **Login:** Encrypted (hex format)
- **Password:** Encrypted (hex format)
- **Server:** Encrypted (hex format)
- **Status:** ❌ Decryption failed
- **Launch File:** `/root/imperial-factory/config/launch_5d439579-31f4-494e-865d-169166fc1c7a.ini`

## 📊 **Trade Logs Access Methods:**

### **Method 1: Supabase Database (Recommended) ⭐**
The `ImperialSync` EA running in Docker containers automatically syncs trades to Supabase:

```sql
-- Check all trades for these accounts
SELECT 
    tje.*,
    bc.login as account_login,
    bc.server as broker_server
FROM trade_journal_entries tje
JOIN broker_connections bc ON tje.broker_connection_id = bc.id
WHERE bc.id IN (
    '4a269b74-38ce-4888-8b09-5f86301ec71e',
    'c46a3b1b-6331-44c9-98fb-2df8e0db843a',
    'ef59770a-87c0-478d-8296-829469394bc1'
)
ORDER BY tje.created_at DESC
LIMIT 100;
```

### **Method 2: Check Container Logs (When Running)**
When containers are active, check:
- Container logs: `docker logs <container_name>`
- MT5 EA logs: `/mt5/MQL5/Experts/ImperialSync.log`
- MT5 terminal logs: `/mt5/logs/`

### **Method 3: MT5 Data Files**
MT5 stores history in:
- `/root/imperial-factory/mt5-master/bases/Default/history/`
- `/root/imperial-factory/mt5-master/bases/Custom/history/`
- `/root/imperial-factory/mt5-master/bases/*/trades/`

**Note:** These are binary files requiring MT5 tools to read.

## 🔍 **What We Can See:**

### **✅ Available:**
- 3 accounts with readable credentials
- Launch files for all 4 accounts
- MT5 terminal files on VPS
- MT5 history/trades directories exist

### **❌ Not Available (Without Containers):**
- Live account balances
- Trade history from MT5 directly
- Open positions
- Account equity/margin

## 🎯 **To Get Trade Logs:**

1. **Check Supabase** - Most reliable method
2. **Start sync tasks** - Will create containers automatically
3. **Wait for EA sync** - ImperialSync syncs trades every few seconds
4. **Query database** - Trades appear in `trade_journal_entries` table

## ⚠️ **Important Notes:**

1. **Python MT5 Library:** Cannot install on Linux - only works in Windows/Wine
2. **Trade Sync:** Happens automatically when containers run
3. **Database:** All trades are synced to Supabase by the EA
4. **Containers:** Currently no containers running (no active sync tasks)

## ✅ **Recommendation:**

**Query Supabase database for trade logs** - This is the most reliable and up-to-date source of trade data. The ImperialSync EA continuously syncs trades from MT5 to the database.
