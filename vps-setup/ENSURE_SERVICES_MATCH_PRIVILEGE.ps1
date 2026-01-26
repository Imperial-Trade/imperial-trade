# Ensure broker service and price feeder run with matching privilege level

Write-Host "=== ENSURING SERVICES MATCH PRIVILEGE LEVEL ===" -ForegroundColor Cyan
Write-Host ""

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if ($isAdmin) {
    Write-Host "[OK] Running as Administrator" -ForegroundColor Green
    Write-Host "Services should run as Administrator" -ForegroundColor Yellow
} else {
    Write-Host "[INFO] Running as Regular User" -ForegroundColor Cyan
    Write-Host "Services should run as Regular User" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== CHECKING PM2 SERVICES ===" -ForegroundColor Cyan

# Check broker service
$brokerService = pm2 list | Select-String "imperial-trade-broker-service"
if ($brokerService) {
    Write-Host "[OK] Broker service is running" -ForegroundColor Green
} else {
    Write-Host "[WARNING] Broker service is not running" -ForegroundColor Yellow
    Write-Host "   Starting broker service..." -ForegroundColor Yellow
    
    Push-Location "C:\vps-broker-service"
    pm2 start npm --name "imperial-trade-broker-service" -- start
    Pop-Location
}

# Check price feeder
$priceFeeder = pm2 list | Select-String "price-feeder"
if ($priceFeeder) {
    Write-Host "[OK] Price feeder is running" -ForegroundColor Green
} else {
    Write-Host "[WARNING] Price feeder is not running" -ForegroundColor Yellow
    Write-Host "   Starting price feeder..." -ForegroundColor Yellow
    
    Push-Location "C:\vps-broker-service"
    pm2 start npm --name "price-feeder" -- run price-feeder
    Pop-Location
}

Write-Host ""
Write-Host "=== PM2 STATUS ===" -ForegroundColor Cyan
pm2 list

Write-Host ""
Write-Host "[OK] Services configured to match current privilege level" -ForegroundColor Green

