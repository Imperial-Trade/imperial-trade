# ============================================================================
# DEPLOY WATCHDOGS - Ensure Price Feeder Never Stops
# ============================================================================
# This script deploys watchdog services to monitor and restart Price Feeder
# Run this on VPS PowerShell as Administrator
# ============================================================================

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  DEPLOYING WATCHDOGS - Ensure Services Never Stop" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

$watchdogDir = "C:\imperial-watchdogs"

# Step 1: Create watchdog directory
Write-Host "[1/7] Creating Watchdog Directory..." -ForegroundColor Yellow
if (-not (Test-Path $watchdogDir)) {
    New-Item -ItemType Directory -Path $watchdogDir -Force | Out-Null
    Write-Host "   ✅ Created: $watchdogDir" -ForegroundColor Green
} else {
    Write-Host "   ✅ Directory exists: $watchdogDir" -ForegroundColor Green
}
Write-Host ""

# Step 2: Check if files need to be copied
Write-Host "[2/7] Checking Watchdog Files..." -ForegroundColor Yellow
$filesExist = $true
if (-not (Test-Path "$watchdogDir\price-feeder-watchdog.js")) {
    Write-Host "   ⚠️  price-feeder-watchdog.js not found" -ForegroundColor Yellow
    Write-Host "   💡 Copy files from vps-setup/imperial-watchdogs/ to $watchdogDir" -ForegroundColor Gray
    $filesExist = $false
}
if (-not (Test-Path "$watchdogDir\mt5-watchdog.js")) {
    Write-Host "   ⚠️  mt5-watchdog.js not found" -ForegroundColor Yellow
    Write-Host "   💡 Copy files from vps-setup/imperial-watchdogs/ to $watchdogDir" -ForegroundColor Gray
    $filesExist = $false
}
if (-not (Test-Path "$watchdogDir\package.json")) {
    Write-Host "   ⚠️  package.json not found" -ForegroundColor Yellow
    Write-Host "   💡 Copy files from vps-setup/imperial-watchdogs/ to $watchdogDir" -ForegroundColor Gray
    $filesExist = $false
}

if ($filesExist) {
    Write-Host "   ✅ All watchdog files found" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "   ❌ Watchdog files missing. Please copy files manually:" -ForegroundColor Red
    Write-Host "   1. Copy vps-setup/imperial-watchdogs/* to $watchdogDir" -ForegroundColor Gray
    Write-Host "   2. Run this script again" -ForegroundColor Gray
    exit 1
}
Write-Host ""

# Step 3: Install dependencies
Write-Host "[3/7] Installing Watchdog Dependencies..." -ForegroundColor Yellow
Set-Location $watchdogDir
if (-not (Test-Path "node_modules")) {
    npm install 2>&1 | Out-Null
    Write-Host "   ✅ Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "   ✅ Dependencies already installed" -ForegroundColor Green
}
Set-Location $env:USERPROFILE
Write-Host ""

# Step 4: Stop existing watchdogs if running
Write-Host "[4/7] Stopping Existing Watchdogs..." -ForegroundColor Yellow
$priceFeederWatchdog = pm2 list | Select-String "Price Feeder Watchdog"
$mt5Watchdog = pm2 list | Select-String "MT5 Watchdog"

if ($priceFeederWatchdog) {
    pm2 delete "Price Feeder Watchdog" 2>&1 | Out-Null
    Write-Host "   ✅ Stopped existing Price Feeder Watchdog" -ForegroundColor Green
}
if ($mt5Watchdog) {
    pm2 delete "MT5 Watchdog" 2>&1 | Out-Null
    Write-Host "   ✅ Stopped existing MT5 Watchdog" -ForegroundColor Green
}
Write-Host ""

# Step 5: Start Price Feeder Watchdog
Write-Host "[5/7] Starting Price Feeder Watchdog..." -ForegroundColor Yellow
Set-Location $watchdogDir
pm2 start "price-feeder-watchdog.js" --name "Price Feeder Watchdog" --autorestart --max-restarts 999999 --min-uptime "5s" --restart-delay 5000 2>&1 | Out-Null
Start-Sleep -Seconds 2
$status = pm2 list | Select-String "Price Feeder Watchdog"
if ($status) {
    Write-Host "   ✅ Price Feeder Watchdog started" -ForegroundColor Green
} else {
    Write-Host "   ❌ Failed to start Price Feeder Watchdog" -ForegroundColor Red
}
Set-Location $env:USERPROFILE
Write-Host ""

# Step 6: Start MT5 Watchdog
Write-Host "[6/7] Starting MT5 Watchdog..." -ForegroundColor Yellow
Set-Location $watchdogDir
pm2 start "mt5-watchdog.js" --name "MT5 Watchdog" --autorestart --max-restarts 999999 --min-uptime "5s" --restart-delay 5000 2>&1 | Out-Null
Start-Sleep -Seconds 2
$status = pm2 list | Select-String "MT5 Watchdog"
if ($status) {
    Write-Host "   ✅ MT5 Watchdog started" -ForegroundColor Green
} else {
    Write-Host "   ❌ Failed to start MT5 Watchdog" -ForegroundColor Red
}
Set-Location $env:USERPROFILE
Write-Host ""

# Step 7: Save PM2 configuration
Write-Host "[7/7] Saving PM2 Configuration..." -ForegroundColor Yellow
pm2 save | Out-Null
Write-Host "   ✅ PM2 configuration saved (watchdogs will auto-start on boot)" -ForegroundColor Green

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  ✅ WATCHDOGS DEPLOYED" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Current PM2 Services:" -ForegroundColor Yellow
pm2 list

Write-Host ""
Write-Host "Watchdog Logs:" -ForegroundColor Yellow
Write-Host "  - Price Feeder Watchdog: pm2 logs 'Price Feeder Watchdog' --lines 50" -ForegroundColor White
Write-Host "  - MT5 Watchdog: pm2 logs 'MT5 Watchdog' --lines 50" -ForegroundColor White
Write-Host ""
Write-Host "✅ Watchdogs will monitor and restart services if they stop!" -ForegroundColor Green
Write-Host "✅ Watchdogs will auto-start on VPS boot!" -ForegroundColor Green
Write-Host ""




