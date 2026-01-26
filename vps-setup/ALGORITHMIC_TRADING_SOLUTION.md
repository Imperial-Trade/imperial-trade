# Algorithmic Trading Auto-Enable Solution

## Problem
When logging into MT5, the "Allow Algorithmic Trading" checkbox in the UI is not enabled by default, even though we've set `AllowDllImports=1` and `AllowLiveTrading=1` in `common.ini`.

## Why This Happens
The `common.ini` settings (`AllowDllImports` and `AllowLiveTrading`) are different from the UI checkbox "Allow Algorithmic Trading". The UI checkbox is stored separately and may not be automatically enabled by config file changes.

## Solutions Provided

### Solution 1: Registry-Based (Recommended First Try)
**Script:** `ENABLE_ALGORITHMIC_TRADING_REGISTRY.ps1`

This script:
- Updates `common.ini` files with `AllowDllImports=1` and `AllowLiveTrading=1`
- Attempts to set registry values (if they exist)
- Works for all MT5 terminals

**Usage:**
```powershell
powershell -ExecutionPolicy Bypass -File C:\vps-broker-service\ENABLE_ALGORITHMIC_TRADING_REGISTRY.ps1
```

**After running:**
1. Restart Generic MT5
2. Manually verify: Tools -> Options -> Expert Advisors -> Allow Algorithmic Trading
3. If still not enabled, try Solution 2

---

### Solution 2: UI Automation (If Registry Doesn't Work)
**Script:** `ENABLE_ALGORITHMIC_TRADING_UI.ps1`

This script uses Windows UI automation to:
- Open MT5 Options dialog
- Navigate to Expert Advisors tab
- Click the "Allow Algorithmic Trading" checkbox
- Save and close

**Usage:**
```powershell
# Make sure Generic MT5 is running and visible
powershell -ExecutionPolicy Bypass -File C:\vps-broker-service\ENABLE_ALGORITHMIC_TRADING_UI.ps1
```

**Requirements:**
- Generic MT5 must be running and visible (not minimized)
- You may need to run this manually after each MT5 restart

---

### Solution 3: Auto-Monitor (Background Service)
**Script:** `AUTO_ENABLE_ON_MT5_START.ps1`

This script runs in the background and:
- Monitors for MT5 process start
- Automatically updates config files when MT5 starts
- Runs continuously (press Ctrl+C to stop)

**Usage:**
```powershell
# Run in background (or create a scheduled task)
powershell -ExecutionPolicy Bypass -File C:\vps-broker-service\AUTO_ENABLE_ON_MT5_START.ps1
```

**Note:** This only updates config files, not the UI checkbox. You may still need to manually enable the checkbox once.

---

### Solution 4: Scheduled Task (Most Reliable)
Create a Windows Scheduled Task that runs `ENSURE_ALGORITHMIC_TRADING_ALWAYS_ENABLED.ps1` every 5 minutes.

**Create the task:**
```powershell
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -File C:\vps-broker-service\ENSURE_ALGORITHMIC_TRADING_ALWAYS_ENABLED.ps1"
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 5) -RepetitionDuration (New-TimeSpan -Days 365)
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
Register-ScheduledTask -TaskName "EnsureMT5AlgorithmicTrading" -Action $action -Trigger $trigger -Principal $principal -Description "Ensures MT5 Algorithmic Trading is always enabled"
```

---

## Manual Method (If All Else Fails)

1. Open Generic MT5
2. Go to: **Tools -> Options -> Expert Advisors**
3. Check the box: **"Allow Algorithmic Trading"**
4. Click **OK**
5. The setting should persist for future logins

---

## Verification

After applying any solution, verify:

1. **Check config files:**
   ```powershell
   Get-Content "$env:APPDATA\MetaQuotes\Terminal\*\config\common.ini" | Select-String "AllowDllImports|AllowLiveTrading"
   ```
   Should show: `AllowDllImports=1` and `AllowLiveTrading=1`

2. **Check MT5 UI:**
   - Tools -> Options -> Expert Advisors
   - Verify "Allow Algorithmic Trading" checkbox is checked

3. **Test with Python:**
   ```python
   import MetaTrader5 as mt5
   mt5.initialize()
   terminal_info = mt5.terminal_info()
   print(f"Trade Allowed: {terminal_info.trade_allowed}")
   ```
   Should print: `Trade Allowed: True`

---

## Recommended Approach

1. **First:** Run `ENABLE_ALGORITHMIC_TRADING_REGISTRY.ps1` and restart MT5
2. **If still not enabled:** Manually enable once in MT5 UI (it should persist)
3. **For automation:** Create the scheduled task (Solution 4) to ensure it stays enabled

---

## Important Notes

- The UI checkbox may need to be enabled **manually once** after MT5 installation
- After manual enable, it usually persists across sessions
- Config file changes (`common.ini`) help but don't always enable the UI checkbox
- The Python MT5 library can still work even if the UI checkbox is unchecked, but it's better to have it enabled


