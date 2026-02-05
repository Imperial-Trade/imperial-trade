# 🔍 EA Not Loading - Diagnosis

## ⚠️ **Issue Identified:**

The container ran for 90 seconds but:
- ❌ **No EA logs** - EA messages not appearing
- ❌ **No heartbeat** - Connection status still `connecting`
- ❌ **No trades** - Database shows 0 trades
- ❌ **No Edge Function calls** - No mt5-sync requests received

---

## 🔍 **Possible Causes:**

1. **EA Not in Container:**
   - EA file might not be in Docker image
   - EA might not be in correct location

2. **EA Not Auto-Loading:**
   - MT5 might not be auto-loading EA
   - launch.ini might not have EA configuration

3. **MT5 Not Connecting:**
   - Credentials might be wrong
   - Server might be unreachable
   - Connection timeout

---

## 🔧 **Next Steps to Diagnose:**

1. **Check EA in Container:**
   ```bash
   docker exec <container> ls -la /mt5/MQL5/Experts/
   ```

2. **Check launch.ini:**
   ```bash
   docker exec <container> cat /mt5/config/launch.ini
   ```

3. **Check MT5 Connection:**
   - Look for "authorized" or "connected" in logs
   - Check if MT5 actually connected to broker

4. **Check EA Auto-Load:**
   - Verify EA is set to auto-start in launch.ini
   - Check if EA appears in MT5's Expert Advisors list

---

## 📋 **What We Need:**

1. Verify EA file exists in container
2. Verify launch.ini has EA auto-start configuration
3. Verify MT5 connected successfully
4. Verify EA loaded and executed
