# Simple working script
Write-Host "FILES:" -ForegroundColor Yellow
Test-Path "C:\vps-broker-service\vps-setup\WORKING_STATUS_CHECK.ps1"
Test-Path "C:\vps-broker-service\dist\index.js"
Test-Path "C:\MT5_BrokerService\terminal64.exe"

Write-Host ""
Write-Host "PM2:" -ForegroundColor Yellow
pm2 status

Write-Host ""
Write-Host "PORT:" -ForegroundColor Yellow
Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "MT5:" -ForegroundColor Yellow
Get-Process -Name terminal64 -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*MT5_BrokerService*" }

Write-Host ""
Write-Host "DONE" -ForegroundColor Green
