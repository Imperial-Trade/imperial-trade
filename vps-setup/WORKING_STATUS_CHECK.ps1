$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SYSTEM STATUS CHECK" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Files
Write-Host "FILES:" -ForegroundColor Yellow
$file1 = Test-Path "C:\vps-broker-service\vps-setup\SUCCESSFUL_VERIFICATION.ps1"
$file2 = Test-Path "C:\vps-broker-service\dist\index.js"
$file3 = Test-Path "C:\MT5_BrokerService\terminal64.exe"

if ($file1) { Write-Host "  OK: SUCCESSFUL_VERIFICATION.ps1" -ForegroundColor Green } else { Write-Host "  MISSING: SUCCESSFUL_VERIFICATION.ps1" -ForegroundColor Red }
if ($file2) { Write-Host "  OK: index.js" -ForegroundColor Green } else { Write-Host "  MISSING: index.js" -ForegroundColor Red }
if ($file3) { Write-Host "  OK: MT5 terminal64.exe" -ForegroundColor Green } else { Write-Host "  MISSING: MT5 terminal64.exe" -ForegroundColor Red }

Write-Host ""

# PM2
Write-Host "PM2:" -ForegroundColor Yellow
$pm2 = pm2 status 2>&1
Write-Host $pm2

Write-Host ""

# Port
Write-Host "PORT 3001:" -ForegroundColor Yellow
$port = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
if ($port) { Write-Host "  OK: LISTENING" -ForegroundColor Green } else { Write-Host "  NOT LISTENING" -ForegroundColor Red }

Write-Host ""

# MT5
Write-Host "MT5:" -ForegroundColor Yellow
$mt5 = Get-Process -Name terminal64 -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*MT5_BrokerService*" }
if ($mt5) { Write-Host "  OK: RUNNING" -ForegroundColor Green } else { Write-Host "  NOT RUNNING" -ForegroundColor Red }

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "CHECK COMPLETE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

exit 0
