# 🔄 Restart Instructions - Force Portable Mode

## What You Need to Do

**YES, you need to restart MT5 to see the changes!**

The deployment script has:
1. ✅ Deleted the AppData folder
2. ✅ Restarted MT5 with `/portable` argument

## Verification Steps

### After MT5 Restarts:

1. **In MT5 window:**
   - Go to: **File > Open Data Folder**
   - Check the path in the address bar

2. **Expected Result:**
   - ✅ **SUCCESS**: Should show `C:\MT5_BrokerService`
   - ❌ **FAIL**: If it still shows `AppData\Roaming`, the restart didn't work

### If It Still Shows AppData\Roaming:

**The script has been executed again to:**
- Close MT5 completely
- Delete the AppData folder again
- Restart MT5 with `/portable` argument

**Wait 5-10 seconds for MT5 to restart, then:**
1. Check File > Open Data Folder again
2. Should now show `C:\MT5_BrokerService`

## Why Restart Is Needed

MT5 remembers the last data folder location. Even after deleting AppData:
- MT5 might recreate it on startup
- The `/portable` argument forces it to use the isolated directory
- Restart ensures the new path is applied

## Success Criteria

After restart:
- ✅ MT5 Data Folder shows: `C:\MT5_BrokerService`
- ✅ No `AppData\Roaming` in the path
- ✅ Connection test completes in 2-5 seconds

---

**Status**: 🔄 **RESTARTING MT5**

**Please wait for MT5 to restart, then verify the Data Folder path!**
