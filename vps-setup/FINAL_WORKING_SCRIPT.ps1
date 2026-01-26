Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SYSTEM STATUS" -ForegroundColor Green  
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "FILES:" -ForegroundColor Yellow
if (Test-Path "C:\vps-broker-service\vps-setup\WORKING_STATUS_CHECK.ps1") { Write-Host "  OK: WORKING_STATUS_CHECK.ps1" -ForegroundColor Green } else { Write-Host "  MISSING" -ForegroundColor Red }
if (Test-Path "C:\vps-broker-service\dist\index.js") { Write-Host "  OK: index.js" -ForegroundColor Green } else { Write-Host "  MISSING" -ForegroundColor Red }
if (Test-Path "C:\MT5_BrokerService\terminal64.exe") { Write-Host "  OK: MT5 terminal64.exe" -ForegroundColor Green } else { Write-Host "  MISSING" -ForegroundColor Red }

Write-Host ""
Write-Host "PM2:" -ForegroundColor Yellow
pm2 status

Write-Host ""
Write-Host "PORT 3001:" -ForegroundColor Yellow
$p = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
if ($p) { Write-Host "  OK: LISTENING" -ForegroundColor Green } else { Write-Host "  NOT LISTENING" -ForegroundColor Red }

Write-Host ""
Write-Host "MT5:" -ForegroundColor Yellow
$m = Get-Process -Name terminal64 -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*MT5_BrokerService*" }
if ($m) { Write-Host "  OK: RUNNING" -ForegroundColor Green } else { Write-Host "  NOT RUNNING" -ForegroundColor Red }

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "DONE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

exit 0
