# 🚨 FIX: MT5 Not Found in Isolated Folder

## The Error
The error `The system cannot find the file specified` means `C:\MT5_BrokerService\terminal64.exe` is missing. The file copy step didn't work.

## Solution: Locate and Copy MT5

**Run this in Administrator PowerShell to find and copy MT5:**

```powershell
# 1. Find where MT5 is installed
$source = "C:\Program Files\MetaTrader 5"
$dest = "C:\MT5_BrokerService"

Write-Host "Checking source: $source" -ForegroundColor Yellow

if (Test-Path "$source\terminal64.exe") {
    # 2. Create destination if missing
    if (-not (Test-Path $dest)) {
        New-Item -ItemType Directory -Path $dest -Force
        Write-Host "Created $dest" -ForegroundColor Green
    }

    # 3. Copy files
    Write-Host "Copying MT5 files... (Wait)" -ForegroundColor Cyan
    Copy-Item -Path "$source\*" -Destination $dest -Recurse -Force
    Write-Host "✅ Copy complete!" -ForegroundColor Green
    
    # 4. Launch
    Write-Host "Launching..." -ForegroundColor Yellow
    Start-Process "$dest\terminal64.exe" -ArgumentList "/portable"
} else {
    Write-Host "❌ MT5 not found in default location!" -ForegroundColor Red
    Write-Host "Please verify where MetaTrader 5 is installed." -ForegroundColor Yellow
}
```

## If MT5 is installed elsewhere (e.g. EC Markets folder)

If the script says "MT5 not found", change the `$source` line to your actual MT5 folder, for example:
```powershell
$source = "C:\Program Files\EC Markets MetaTrader 5"
```
or
```powershell
$source = "C:\Program Files\MetaTrader 5 Terminal"
```

## Once Launched
1. **Check File > Open Data Folder**
2. Must show: `C:\MT5_BrokerService`

---
**Status**: 🛠️ **FIXING MISSING FILES**
