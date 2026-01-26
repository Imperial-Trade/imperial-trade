# 🔍 MT5 Connection Status Check

## ✅ **What We're Looking For:**

### **Success Indicators:**
- ✅ `authorized` in logs
- ✅ `connected to server` in logs
- ✅ Account login number visible (81071266)
- ✅ Process running continuously

### **Error Indicators:**
- ❌ `IPC timeout` or `-10005` error
- ❌ `Xvfb` not started
- ❌ Wrong path errors
- ❌ Process crashes immediately

### **Wine Errors (Usually Safe to Ignore):**
- ⚠️ `err:ole:StdMarshalImpl_MarshalInterface` - Normal
- ⚠️ `err:ole:CoMarshalInterface` - Normal
- ⚠️ `err:setupapi:SetupDefaultQueueCallbackW` - Normal
- ⚠️ `Could not find Wine Gecko` - Normal

---

## 📋 **Testing Steps:**

1. **Clean up processes:**
   ```bash
   wineserver -k
   killall -9 wine64 terminal64.exe Xvfb
   ```

2. **Start Xvfb:**
   ```bash
   Xvfb :99 -screen 0 1024x768x16 &
   export DISPLAY=:99
   sleep 2
   ```

3. **Launch MT5:**
   ```bash
   cd /root/imperial-factory/mt5-master
   WINEDEBUG=-all wine terminal64.exe /portable /config:/root/imperial-factory/test-config/launch.ini
   ```

4. **Check logs for:**
   - `authorized`
   - `connected to server`
   - Account number (81071266)
   - No `-10005` errors

---

## 🎯 **Current Status:**

**Testing in progress...**

**Next:** Check MT5 logs for connection confirmation.
