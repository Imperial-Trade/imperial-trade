Write-Host "FILES:" -ForegroundColor Yellow
Test-Path "C:\vps-broker-service\vps-setup\RUN_THIS_NOW.ps1"
Test-Path "C:\vps-broker-service\dist\index.js"  
Test-Path "C:\MT5_BrokerService\terminal64.exe"

Write-Host ""
Write-Host "PM2:" -ForegroundColor Yellow
pm2 status

Write-Host ""
Write-Host "PORT 3001:" -ForegroundColor Yellow
Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "MT5:" -ForegroundColor Yellow
Get-Process -Name terminal64 -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "DONE" -ForegroundColor Green
