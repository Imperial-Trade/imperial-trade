# ============================================================================
# CHECK MT5 SETUP - Verify Generic MT5 is Ready for Journal Sync
# ============================================================================
# Run this on VPS PowerShell as Administrator
# This checks if Generic MT5 is installed and ready for journal sync
# ============================================================================

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  CHECKING MT5 SETUP FOR JOURNAL SYNC" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

$genericMT5Path = "C:\Program Files\MetaTrader 5\terminal64.exe"
$ecMarketsMT5Path = "C:\Program Files\EC Markets MetaTrader 5\terminal64.exe"

# Step 1: Check Generic MT5 Installation
Write-Host "[1/5] Checking Generic MT5 Installation..." -ForegroundColor Yellow
if (Test-Path $genericMT5Path) {
    Write-Host "   ✅ Generic MT5 is INSTALLED at: $genericMT5Path" -ForegroundColor Green
} else {
    Write-Host "   ❌ Generic MT5 is NOT INSTALLED" -ForegroundColor Red
    Write-Host "   💡 Download from: https://www.metatrader5.com/en/download" -ForegroundColor Yellow
    Write-Host "   💡 Install to: C:\Program Files\MetaTrader 5\" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   ⚠️  Journal sync will NOT work without Generic MT5!" -ForegroundColor Red
}
Write-Host ""

# Step 2: Check EC Markets MT5 (for reference)
Write-Host "[2/5] Checking EC Markets MT5 (for price feeds)..." -ForegroundColor Yellow
if (Test-Path $ecMarketsMT5Path) {
    Write-Host "   ✅ EC Markets MT5 is INSTALLED (used for live prices)" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  EC Markets MT5 not found (but not required for journal sync)" -ForegroundColor Yellow
}
Write-Host ""

# Step 3: Check if Generic MT5 is Running
Write-Host "[3/5] Checking if Generic MT5 is Running..." -ForegroundColor Yellow
$genericMT5Process = Get-Process -Name terminal64 -ErrorAction SilentlyContinue | Where-Object { $_.Path -like '*MetaTrader 5*' -and $_.Path -notlike '*EC Markets*' }
if ($genericMT5Process) {
    Write-Host "   ✅ Generic MT5 is RUNNING (PID: $($genericMT5Process.Id))" -ForegroundColor Green
    Write-Host "   📍 Path: $($genericMT5Process.Path)" -ForegroundColor White
} else {
    Write-Host "   ❌ Generic MT5 is NOT RUNNING" -ForegroundColor Red
    Write-Host "   💡 Start it: Start-Process '$genericMT5Path'" -ForegroundColor Yellow
    Write-Host "   ⚠️  Journal sync will NOT work if Generic MT5 is not running!" -ForegroundColor Red
}
Write-Host ""

# Step 4: Check EC Markets MT5 Running Status (for reference)
Write-Host "[4/5] Checking EC Markets MT5 (for price feeds)..." -ForegroundColor Yellow
$ecMarketsMT5Process = Get-Process -Name terminal64 -ErrorAction SilentlyContinue | Where-Object { $_.Path -like '*EC Markets*' }
if ($ecMarketsMT5Process) {
    Write-Host "   ✅ EC Markets MT5 is RUNNING (PID: $($ecMarketsMT5Process.Id))" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  EC Markets MT5 not running (but not required for journal sync)" -ForegroundColor Yellow
}
Write-Host ""

# Step 5: Check VPS Broker Service
Write-Host "[5/5] Checking VPS Broker Service..." -ForegroundColor Yellow
$brokerService = pm2 list 2>&1 | Select-String "imperial-trade-broker-service"
if ($brokerService) {
    $status = pm2 list 2>&1 | Select-String "imperial-trade-broker-service"
    if ($status -match "online") {
        Write-Host "   ✅ VPS Broker Service is RUNNING" -ForegroundColor Green
    } else {
        Write-Host "   ❌ VPS Broker Service is NOT RUNNING" -ForegroundColor Red
        Write-Host "   💡 Start it: pm2 restart imperial-trade-broker-service" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ❌ VPS Broker Service NOT FOUND in PM2" -ForegroundColor Red
    Write-Host "   💡 Check if service is deployed" -ForegroundColor Yellow
}
Write-Host ""

# Summary
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  SUMMARY" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

$genericMT5Installed = Test-Path $genericMT5Path
$genericMT5Running = $null -ne $genericMT5Process

if ($genericMT5Installed -and $genericMT5Running) {
    Write-Host "✅ Generic MT5 is READY for journal sync!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Yellow
    Write-Host "  1. Open Generic MT5" -ForegroundColor White
    Write-Host "  2. Log in with your broker credentials manually ONCE" -ForegroundColor White
    Write-Host "  3. Keep the terminal OPEN and logged in" -ForegroundColor White
    Write-Host "  4. Try syncing trades from the frontend" -ForegroundColor White
} else {
    Write-Host "❌ Generic MT5 is NOT READY for journal sync!" -ForegroundColor Red
    Write-Host ""
    if (-not $genericMT5Installed) {
        Write-Host "  ❌ Generic MT5 is NOT INSTALLED" -ForegroundColor Red
        Write-Host "     💡 Install from: https://www.metatrader5.com/en/download" -ForegroundColor Yellow
    }
    if (-not $genericMT5Running) {
        Write-Host "  ❌ Generic MT5 is NOT RUNNING" -ForegroundColor Red
        Write-Host "     💡 Start it: Start-Process '$genericMT5Path'" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""



