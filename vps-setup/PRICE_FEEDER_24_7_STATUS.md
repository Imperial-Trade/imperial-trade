# 🔒 Price Feeder 24/7 Status Check

## ✅ Current Configuration Status

### 1. **PM2 Auto-Restart** ✅
- **Status**: Configured
- **Max Restarts**: Unlimited (999,999)
- **Min Uptime**: 1000ms (1 second)
- **Exponential Backoff**: 100ms
- **Behavior**: Automatically restarts if process crashes

### 2. **PM2 Persistence** ✅
- **Status**: Enabled
- **Save File**: `C:\Users\Administrator\.pm2\dump.pm2`
- **Behavior**: Restores processes after PM2 restart or system reboot

### 3. **Windows Startup Task** ⚠️
- **Status**: Needs Verification
- **Task Name**: `ImperialPriceFeederAutoStart`
- **Behavior**: Should start Price Feeder on Windows boot
- **Action Required**: Verify if task exists and is enabled

### 4. **Watchdog** ⚠️
- **Status**: Needs Verification
- **Location**: `vps-setup/imperial-watchdogs/price-feeder-watchdog.js`
- **Behavior**: Monitors Price Feeder and restarts if needed
- **Action Required**: Verify if watchdog is running

---

## 🔍 Verification Commands

### Check PM2 Auto-Restart
```powershell
pm2 describe "Imperial Price Feeder"
```
**Look for:**
- `restart time`: Should show restart count
- `max_restarts`: Should be 999999 (unlimited)
- `min_uptime`: Should be 1000ms

### Check PM2 Save
```powershell
Test-Path "$env:USERPROFILE\.pm2\dump.pm2"
```
**Should return**: `True`

### Check Windows Startup Task
```powershell
Get-ScheduledTask -TaskName "*Price*", "*Feeder*", "*PM2*"
```
**Should show**: Task with State = "Ready"

### Check Watchdog
```powershell
Get-Process node | Where-Object { $_.Path -like '*watchdog*' }
```
**Should show**: Node process running watchdog

---

## 🛡️ Protection Layers

### Layer 1: PM2 Auto-Restart ✅
- **What it does**: Automatically restarts Price Feeder if it crashes
- **When it triggers**: Process exits, crashes, or errors
- **Restart limit**: Unlimited
- **Status**: ✅ Configured

### Layer 2: PM2 Persistence ✅
- **What it does**: Saves process list, restores on PM2 restart
- **When it triggers**: After `pm2 save` command
- **Survives**: PM2 restarts, but NOT Windows reboots
- **Status**: ✅ Enabled

### Layer 3: Windows Startup Task ⚠️
- **What it does**: Starts Price Feeder automatically on Windows boot
- **When it triggers**: On Windows startup/login
- **Survives**: Windows reboots
- **Status**: ⚠️ Needs Verification

### Layer 4: Watchdog ⚠️
- **What it does**: Monitors Price Feeder, restarts if stopped
- **When it triggers**: If Price Feeder is not running
- **Survives**: As long as watchdog is running
- **Status**: ⚠️ Needs Verification

---

## 🔧 Setup Commands (If Not Configured)

### Ensure PM2 Auto-Restart
```powershell
pm2 set "Imperial Price Feeder" max_restarts 999999
pm2 set "Imperial Price Feeder" min_uptime 1000
pm2 save
```

### Create Windows Startup Task
```powershell
# Run as Administrator
$action = New-ScheduledTaskAction -Execute "node" -Argument "C:\Users\Administrator\AppData\Roaming\npm\global\node_modules\pm2\bin\pm2 resurrect"
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId "Administrator" -RunLevel Highest
Register-ScheduledTask -TaskName "ImperialPriceFeederAutoStart" -Action $action -Trigger $trigger -Principal $principal
```

### Start Watchdog
```powershell
pm2 start C:\vps-broker-service\vps-setup\imperial-watchdogs\price-feeder-watchdog.js --name "Price Feeder Watchdog"
pm2 save
```

---

## ✅ Expected Behavior

### If Price Feeder Crashes:
1. **PM2 Auto-Restart** → Restarts immediately (within 1 second)
2. **Watchdog** → Detects and ensures it stays running

### If Windows Reboots:
1. **Windows Startup Task** → Starts PM2
2. **PM2 Persistence** → Restores Price Feeder process
3. **Watchdog** → Ensures it stays running

### If PM2 Restarts:
1. **PM2 Persistence** → Restores Price Feeder process
2. **Watchdog** → Ensures it stays running

---

## 🚨 Important Notes

1. **MT5 Must Stay Open**: Price Feeder requires EC Markets MT5 to be open and logged in
2. **Manual Login Required**: MT5 cannot be logged in programmatically
3. **Watchdog Dependency**: Watchdog must be running for monitoring
4. **Startup Task Dependency**: Windows startup task must be enabled

---

**Status**: 🔍 **VERIFYING CONFIGURATION**
