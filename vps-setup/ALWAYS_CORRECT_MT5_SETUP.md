# ✅ Always Open Correct MT5 - Setup Complete

## What Was Done

1. ✅ **Deleted old shortcuts** that might open wrong MT5
2. ✅ **Created new shortcut** on Desktop: `MT5 Broker Service.lnk`
3. ✅ **Launched MT5** with `/portable` argument
4. ✅ **Verified** isolated folder is being used

## The New Shortcut

**Location**: Desktop → `MT5 Broker Service.lnk`

**Properties**:
- **Target**: `C:\MT5_BrokerService\terminal64.exe`
- **Arguments**: `/portable` (CRITICAL!)
- **Working Directory**: `C:\MT5_BrokerService`

## How to Use

### ✅ CORRECT Way:
1. **Double-click** the desktop shortcut: `MT5 Broker Service.lnk`
2. MT5 will **always** open in portable mode
3. Data folder will **always** show: `C:\MT5_BrokerService`

### ❌ WRONG Way:
- **Don't** double-click `terminal64.exe` directly
- **Don't** use any other shortcuts
- **Don't** open from Start Menu

## Verification

**Every time you open MT5:**
1. Go to: **File > Open Data Folder**
2. **MUST show**: `C:\MT5_BrokerService`
3. **If it shows AppData\Roaming**: Close MT5 and use the desktop shortcut

## If MT5 Still Shows AppData

**Run this in PowerShell:**

```powershell
# Close all
taskkill /F /IM terminal64.exe
Start-Sleep -Seconds 3

# Delete AppData folder
Remove-Item -Path "C:\Users\Administrator\AppData\Roaming\MetaQuotes\Terminal\D0E8209F77C8CF37AD8BF550E51FF075" -Recurse -Force -ErrorAction SilentlyContinue

# Launch using shortcut (or run this)
Start-Process "C:\MT5_BrokerService\terminal64.exe" -ArgumentList "/portable"
```

## Auto-Start (Optional)

If you want MT5 to start automatically on boot, we can create a Windows Task Scheduler entry that uses the correct path and `/portable` argument.

---

**Status**: ✅ **SETUP COMPLETE**

**Always use the desktop shortcut to open MT5!**
