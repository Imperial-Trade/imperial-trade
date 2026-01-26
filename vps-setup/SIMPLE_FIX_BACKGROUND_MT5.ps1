# Simple Fix: Close All and Launch Correct MT5
# Run this in Administrator PowerShell

Write-Host "Closing all MT5..." -ForegroundColor Yellow
taskkill /F /IM terminal64.exe 2>&1 | Out-Null
Start-Sleep -Seconds 3

Write-Host "Checking isolated directory..." -ForegroundColor Cyan
$correctPath = "C:\MT5_BrokerService\terminal64.exe"

if (Test-Path $correctPath) {
    Write-Host "✅ Found correct MT5 at: $correctPath" -ForegroundColor Green
    Write-Host "Launching in portable mode..." -ForegroundColor Yellow
    Start-Process $correctPath -ArgumentList "/portable"
    Start-Sleep -Seconds 5
    Write-Host "✅ MT5 launched!" -ForegroundColor Green
} else {
    Write-Host "❌ Correct MT5 not found. Copying files..." -ForegroundColor Red
    
    $source = "C:\Program Files\MetaTrader 5"
    $dest = "C:\MT5_BrokerService"
    
    if (Test-Path "$source\terminal64.exe") {
        if (-not (Test-Path $dest)) { New-Item -ItemType Directory -Path $dest -Force | Out-Null }
        Write-Host "Copying files (this takes a minute)..." -ForegroundColor Cyan
        Copy-Item -Path "$source\*" -Destination $dest -Recurse -Force
        Write-Host "✅ Copy complete!" -ForegroundColor Green
        Write-Host "Launching..." -ForegroundColor Yellow
        Start-Process "$dest\terminal64.exe" -ArgumentList "/portable"
    } else {
        Write-Host "❌ Cannot find MT5 installation!" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "VERIFICATION:" -ForegroundColor Yellow
Write-Host "1. MT5 window should open" -ForegroundColor White
Write-Host "2. Go to: File > Open Data Folder" -ForegroundColor White
Write-Host "3. Should show: C:\MT5_BrokerService" -ForegroundColor Green
