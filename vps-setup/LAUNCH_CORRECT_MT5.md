# ✅ Launching Correct MT5 via PowerShell

## Command Executed

I've executed the PowerShell command to:
1. ✅ Close all MT5 instances (including the wrong one)
2. ✅ Launch the correct MT5 from `C:\MT5_BrokerService`
3. ✅ Use `/portable` argument to ensure isolation

## What You Should See

**On the VPS:**
- All MT5 windows will close
- A new MT5 window will open (this is the correct one)
- Wait 5-10 seconds for it to fully load

## Critical Verification

**After the new MT5 window opens:**

1. **In MT5, go to: File > Open Data Folder**
2. **Check the path in the address bar**
3. **✅ SUCCESS**: Should show `C:\MT5_BrokerService`
4. **❌ FAIL**: If it shows `AppData\Roaming`, close it and I'll run the command again

## Next Steps

Once verified:
1. **Log in** (if not already logged in):
   - Login: `800107112`
   - Password: `Demo@123`
   - Server: `ECMarketsLtd-Demo`
   - Check "Save password"

2. **Enable Algo Trading**:
   - Click "Algo Trading" button (make it green)
   - Tools > Options > Expert Advisors > Check both boxes

3. **Test Connection**:
   - Go to your website
   - Click "Connect Broker"
   - Should work instantly!

---

**Status**: 🚀 **CORRECT MT5 LAUNCHED**

**Please verify the Data Folder shows `C:\MT5_BrokerService`!**
