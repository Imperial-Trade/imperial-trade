# 🔄 Manual Restart Instructions

## What Just Happened

I've executed the restart commands on the VPS. Here's what was done:

1. ✅ Killed all MT5 processes
2. ✅ Deleted AppData folder
3. ✅ Started MT5 with `/portable` argument

## What You Should See

**On the VPS:**
- MT5 window should close
- MT5 should restart automatically
- Wait 5-10 seconds for it to fully restart

## Critical Verification

**After MT5 restarts:**

1. **In MT5 window:**
   - Go to: **File > Open Data Folder**
   - Check the path in the address bar

2. **Expected Result:**
   - ✅ **SUCCESS**: Should show `C:\MT5_BrokerService`
   - ❌ **FAIL**: If it still shows `AppData\Roaming`, continue below

## If MT5 Didn't Restart

**If you don't see MT5 restart on the VPS, run this manually:**

**PowerShell (Run as Administrator):**
```powershell
# Close MT5
taskkill /F /IM terminal64.exe

# Wait
Start-Sleep -Seconds 3

# Delete AppData folder
Remove-Item -Path "C:\Users\Administrator\AppData\Roaming\MetaQuotes\Terminal\D0E8209F77C8CF37AD8BF550E51FF075" -Recurse -Force

# Start MT5 in portable mode
Start-Process "C:\MT5_BrokerService\terminal64.exe" -ArgumentList "/portable"
```

## If AppData Folder Still Exists

**If the AppData folder wasn't deleted (you can check in File Explorer):**

1. Close MT5 completely
2. Manually delete: `C:\Users\Administrator\AppData\Roaming\MetaQuotes\Terminal\D0E8209F77C8CF37AD8BF550E51FF075`
3. Restart MT5 with: `Start-Process "C:\MT5_BrokerService\terminal64.exe" -ArgumentList "/portable"`

## Success Criteria

After restart:
- ✅ MT5 Data Folder shows: `C:\MT5_BrokerService`
- ✅ No Error [32] in MT5 Journal
- ✅ Connection test completes in 2-5 seconds

---

**Status**: 🔄 **RESTART EXECUTED**

**Please check if MT5 restarted on the VPS, then verify the Data Folder path!**
