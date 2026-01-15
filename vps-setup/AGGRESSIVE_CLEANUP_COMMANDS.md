# 🔥 Aggressive Cleanup - Force Close Everything

## The Problem
Some processes are still holding locks, preventing the AppData folder from being deleted.

## Aggressive Solution

**Copy and paste this ENTIRE block into Administrator PowerShell:**

```powershell
# Step 1: Kill ALL MT5-related processes
Get-Process | Where-Object { $_.ProcessName -like '*terminal*' -or $_.ProcessName -like '*mt5*' -or $_.ProcessName -like '*metatrader*' } | Stop-Process -Force -ErrorAction SilentlyContinue
taskkill /F /IM terminal64.exe /T 2>&1 | Out-Null
taskkill /F /IM python.exe /T 2>&1 | Out-Null

# Wait longer
Start-Sleep -Seconds 5

# Step 2: Delete ALL terminal folders in AppData
$appDataPath = "C:\Users\Administrator\AppData\Roaming\MetaQuotes\Terminal"
if (Test-Path $appDataPath) {
    Get-ChildItem -Path $appDataPath -Directory | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "✅ Deleted all terminal folders" -ForegroundColor Green
}

# Step 3: Launch with /portable
Start-Process "C:\MT5_BrokerService\terminal64.exe" -ArgumentList "/portable"

# Wait
Start-Sleep -Seconds 8

Write-Host "✅ MT5 launched!" -ForegroundColor Green
Write-Host "Check: File > Open Data Folder should show C:\MT5_BrokerService" -ForegroundColor Cyan
```

## What This Does

1. **Kills ALL processes** (not just terminal64.exe)
2. **Waits 5 seconds** for everything to release
3. **Deletes ALL terminal folders** in AppData (not just one)
4. **Launches with /portable** argument

## After Running

1. All MT5 windows will close
2. New MT5 window will open
3. Go to: **File > Open Data Folder**
4. **MUST show**: `C:\MT5_BrokerService`

---

**This is the nuclear option - it will close EVERYTHING!**
