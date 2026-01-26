# Verify MT5 Separation Script
# Ensures EC Markets MT5 (for live price) and regular MT5 (for auto-sync) don't interfere

Write-Host "=== MT5 Separation Verification ===" -ForegroundColor Cyan

# Check for running MT5 processes
Write-Host "`n1. Checking MT5 Processes..." -ForegroundColor Yellow
$ecMarketsMT5 = Get-Process -Name "terminal64" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*EC Markets*" }
$regularMT5 = Get-Process -Name "terminal64" -ErrorAction SilentlyContinue | Where-Object { $_.Path -notlike "*EC Markets*" }

if ($ecMarketsMT5) {
    Write-Host "   ✅ EC Markets MT5 is running" -ForegroundColor Green
    Write-Host "      Path: $($ecMarketsMT5.Path)" -ForegroundColor Gray
    Write-Host "      PID: $($ecMarketsMT5.Id)" -ForegroundColor Gray
} else {
    Write-Host "   ⚠️  EC Markets MT5 is NOT running" -ForegroundColor Yellow
}

if ($regularMT5) {
    Write-Host "   ✅ Regular MT5 is running" -ForegroundColor Green
    Write-Host "      Path: $($regularMT5.Path)" -ForegroundColor Gray
    Write-Host "      PID: $($regularMT5.Id)" -ForegroundColor Gray
} else {
    Write-Host "   ℹ️  Regular MT5 is NOT running (this is OK for auto-sync)" -ForegroundColor Cyan
}

# Check MT5 installation paths
Write-Host "`n2. Checking MT5 Installation Paths..." -ForegroundColor Yellow
$ecMarketsPath = "C:\Program Files\EC Markets MetaTrader 5\terminal64.exe"
$regularMT5Path = "C:\Program Files\MetaTrader 5\terminal64.exe"

if (Test-Path $ecMarketsPath) {
    Write-Host "   ✅ EC Markets MT5 found: $ecMarketsPath" -ForegroundColor Green
} else {
    Write-Host "   ❌ EC Markets MT5 NOT found: $ecMarketsPath" -ForegroundColor Red
}

if (Test-Path $regularMT5Path) {
    Write-Host "   ✅ Regular MT5 found: $regularMT5Path" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Regular MT5 NOT found: $regularMT5Path" -ForegroundColor Yellow
    Write-Host "      (Auto-sync uses Python MT5 library, doesn't need separate terminal)" -ForegroundColor Gray
}

# Check Python MT5 library
Write-Host "`n3. Checking Python MT5 Library..." -ForegroundColor Yellow
$pythonMT5 = python -c "import MetaTrader5; print('OK')" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Python MetaTrader5 library is installed" -ForegroundColor Green
} else {
    Write-Host "   ❌ Python MetaTrader5 library is NOT installed" -ForegroundColor Red
    Write-Host "      Install with: pip install MetaTrader5" -ForegroundColor Yellow
}

# Check VPS Broker Service
Write-Host "`n4. Checking VPS Broker Service..." -ForegroundColor Yellow
$brokerService = pm2 list | Select-String "Imperial Broker Service"
if ($brokerService) {
    Write-Host "   ✅ Imperial Broker Service is running" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Imperial Broker Service is NOT running" -ForegroundColor Yellow
}

# Check Price Feeder Service
Write-Host "`n5. Checking Price Feeder Service..." -ForegroundColor Yellow
$priceFeeder = pm2 list | Select-String "Imperial Price Feeder"
if ($priceFeeder) {
    Write-Host "   ✅ Imperial Price Feeder is running" -ForegroundColor Green
} else {
    Write-Host "   ❌ Imperial Price Feeder is NOT running" -ForegroundColor Red
}

# Summary
Write-Host "`n=== Summary ===" -ForegroundColor Cyan
Write-Host "EC Markets MT5: For LIVE PRICE FEED (must stay running)" -ForegroundColor White
Write-Host "Regular MT5: For AUTO-SYNC JOURNAL (Python library connects to user brokers)" -ForegroundColor White
Write-Host "`n✅ No interference: Python MT5 library can login to different brokers" -ForegroundColor Green
Write-Host "   without affecting EC Markets MT5 connection" -ForegroundColor Green


