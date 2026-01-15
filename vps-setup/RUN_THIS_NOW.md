# ⚡ Quick Fix - Run This Now

## The Problem
MT5 might be running in the background, or the directory might be empty.

## Simple Solution

**Run this in Administrator PowerShell on the VPS:**

```powershell
# Close all MT5
taskkill /F /IM terminal64.exe
Start-Sleep -Seconds 3

# Launch correct one
Start-Process "C:\MT5_BrokerService\terminal64.exe" -ArgumentList "/portable"
```

**OR use the script I just created:**

1. Open **Administrator PowerShell**
2. Run:
   ```powershell
   cd C:\vps-broker-service\vps-setup
   .\SIMPLE_FIX_BACKGROUND_MT5.ps1
   ```

## What It Does
- Closes ALL MT5 instances
- Checks if isolated directory exists
- If missing, copies files from Program Files
- Launches the correct MT5

## After It Runs
1. MT5 window will open
2. Go to: **File > Open Data Folder**
3. Should show: `C:\MT5_BrokerService`

---

**Status**: 🚀 **SCRIPT READY**

**Run `SIMPLE_FIX_BACKGROUND_MT5.ps1` on the VPS!**
