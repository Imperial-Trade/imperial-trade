# ============================================================================
# RESTART PRICE FEEDER NOW - Quick Restart Script
# ============================================================================
# This script quickly restarts the Price Feeder to get live prices working again
# Run this on VPS if prices stopped updating
# ============================================================================

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  RESTARTING PRICE FEEDER - Getting Live Prices Working" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

$serviceName = "Imperial Price Feeder"

# Check if service exists
Write-Host "[1/3] Checking Price Feeder Service..." -ForegroundColor Yellow
$pm2List = pm2 list
$priceFeederExists = $pm2List | Select-String $serviceName

if ($priceFeederExists) {
    Write-Host "   ✅ Price Feeder FOUND in PM2" -ForegroundColor Green
    
    # Get status
    $status = pm2 jlist | ConvertFrom-Json | Where-Object { $_.name -eq $serviceName }
    if ($status) {
        Write-Host "   Current Status: $($status.pm2_env.status)" -ForegroundColor Gray
    }
    
    # Restart service
    Write-Host "[2/3] Restarting Price Feeder..." -ForegroundColor Yellow
    pm2 restart $serviceName
    Start-Sleep -Seconds 3
    Write-Host "   ✅ Price Feeder restarted" -ForegroundColor Green
    
} else {
    Write-Host "   ❌ Price Feeder NOT FOUND in PM2" -ForegroundColor Red
    Write-Host "   💡 Try running: ENSURE_PRICE_FEEDER_NEVER_STOPS.ps1" -ForegroundColor Yellow
    exit 1
}

# Check EC Markets MT5
Write-Host "[3/3] Checking EC Markets MT5..." -ForegroundColor Yellow
$mt5Process = Get-Process -Name "terminal64" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*EC Markets*" }
if ($mt5Process) {
    Write-Host "   ✅ EC Markets MT5 is RUNNING" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  EC Markets MT5 NOT RUNNING - Starting..." -ForegroundColor Yellow
    $mt5Path = "C:\Program Files\EC Markets MetaTrader 5\terminal64.exe"
    if (Test-Path $mt5Path) {
        Start-Process $mt5Path
        Start-Sleep -Seconds 5
        Write-Host "   ✅ EC Markets MT5 started" -ForegroundColor Green
        Write-Host "   ⚠️  IMPORTANT: Log in to EC Markets account!" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  ✅ RESTART COMPLETE" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Check logs: pm2 logs '$serviceName' --lines 50" -ForegroundColor White
Write-Host "Verify prices: Check Supabase database (should update every 1-2 seconds)" -ForegroundColor White
Write-Host ""




