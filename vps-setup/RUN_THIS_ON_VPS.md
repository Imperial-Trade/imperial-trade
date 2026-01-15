# 🚀 Run This Script on VPS

## The Problem

The remote commands may not be executing properly. **You need to run the script directly on the VPS.**

## Solution: Run Script Locally on VPS

### Option 1: Right-Click Method (Easiest)

1. **On the VPS**, navigate to:
   ```
   C:\vps-broker-service\vps-setup\
   ```

2. **Find the file**: `RESTART_MT5_NOW.ps1`

3. **Right-click** on `RESTART_MT5_NOW.ps1`

4. **Select**: "Run with PowerShell"

5. **Wait** for the script to complete

6. **Check MT5**: File > Open Data Folder

### Option 2: PowerShell Method

1. **Open PowerShell as Administrator** on the VPS

2. **Run these commands:**
   ```powershell
   cd C:\vps-broker-service\vps-setup
   .\RESTART_MT5_NOW.ps1
   ```

3. **Wait** for the script to complete

4. **Check MT5**: File > Open Data Folder

## What the Script Does

1. ✅ Closes MT5 completely
2. ✅ Deletes AppData folder
3. ✅ Starts MT5 with `/portable` argument
4. ✅ Verifies MT5 is running

## After Running the Script

**Critical Verification:**
1. In MT5, go to: **File > Open Data Folder**
2. Check the path in the address bar
3. **Should show**: `C:\MT5_BrokerService`
4. **If it shows AppData\Roaming**: Close MT5 and run the script again

## Manual Alternative

If the script doesn't work, run these commands manually in PowerShell:

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

---

**Status**: 📋 **SCRIPT READY ON VPS**

**Please run `RESTART_MT5_NOW.ps1` directly on the VPS!**
