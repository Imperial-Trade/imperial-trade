# ============================================================================
# COPY AND PASTE THIS ENTIRE SCRIPT INTO POWERSHELL (AS ADMINISTRATOR)
# ============================================================================

Write-Host "=== FIXING ALL PATHS ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Create folders
Write-Host "Step 1: Creating folders..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path "C:\imperial-price-feeder\setup" -Force | Out-Null
New-Item -ItemType Directory -Path "C:\imperial-price-feeder\watchdogs" -Force | Out-Null
Write-Host "  ✅ Folders created" -ForegroundColor Green
Write-Host ""

# Step 2: Copy script
Write-Host "Step 2: Copying script..." -ForegroundColor Yellow
if (Test-Path "C:\vps-broker-service\vps-setup\VERIFY_AND_ENSURE_24_7.ps1") {
    Copy-Item "C:\vps-broker-service\vps-setup\VERIFY_AND_ENSURE_24_7.ps1" "C:\imperial-price-feeder\setup\VERIFY_AND_ENSURE_24_7.ps1" -Force
    Write-Host "  ✅ Script copied" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Script not found at source" -ForegroundColor Yellow
}
Write-Host ""

# Step 3: Copy watchdog
Write-Host "Step 3: Copying watchdog..." -ForegroundColor Yellow
if (Test-Path "C:\vps-broker-service\vps-setup\imperial-watchdogs\price-feeder-watchdog.js") {
    Copy-Item "C:\vps-broker-service\vps-setup\imperial-watchdogs\price-feeder-watchdog.js" "C:\imperial-price-feeder\watchdogs\price-feeder-watchdog.js" -Force
    Write-Host "  ✅ Watchdog copied" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Watchdog not found at source" -ForegroundColor Yellow
}
Write-Host ""

# Step 4: Update paths in script
Write-Host "Step 4: Updating paths in script..." -ForegroundColor Yellow
if (Test-Path "C:\imperial-price-feeder\setup\VERIFY_AND_ENSURE_24_7.ps1") {
    $content = Get-Content "C:\imperial-price-feeder\setup\VERIFY_AND_ENSURE_24_7.ps1" -Raw
    $content = $content -replace 'C:\\vps-broker-service\\vps-setup\\imperial-watchdogs\\price-feeder-watchdog.js', 'C:\imperial-price-feeder\watchdogs\price-feeder-watchdog.js'
    Set-Content "C:\imperial-price-feeder\setup\VERIFY_AND_ENSURE_24_7.ps1" -Value $content -NoNewline
    Write-Host "  ✅ Paths updated" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Script not found" -ForegroundColor Yellow
}
Write-Host ""

# Verification
Write-Host "=== VERIFICATION ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Broker Service:" -ForegroundColor Yellow
if (Test-Path "C:\vps-broker-service") {
    Write-Host "  ✅ C:\vps-broker-service" -ForegroundColor Green
} else {
    Write-Host "  ❌ C:\vps-broker-service" -ForegroundColor Red
}

Write-Host "Price Feeder:" -ForegroundColor Yellow
if (Test-Path "C:\imperial-price-feeder") {
    Write-Host "  ✅ C:\imperial-price-feeder" -ForegroundColor Green
} else {
    Write-Host "  ❌ C:\imperial-price-feeder" -ForegroundColor Red
}

Write-Host "Price Feeder Script:" -ForegroundColor Yellow
if (Test-Path "C:\imperial-price-feeder\setup\VERIFY_AND_ENSURE_24_7.ps1") {
    Write-Host "  ✅ Script exists" -ForegroundColor Green
} else {
    Write-Host "  ❌ Script missing" -ForegroundColor Red
}

Write-Host "Price Feeder Watchdog:" -ForegroundColor Yellow
if (Test-Path "C:\imperial-price-feeder\watchdogs\price-feeder-watchdog.js") {
    Write-Host "  ✅ Watchdog exists" -ForegroundColor Green
} else {
    Write-Host "  ❌ Watchdog missing" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== COMPLETE ===" -ForegroundColor Green
Write-Host ""
Write-Host "CORRECT STRUCTURE:" -ForegroundColor Cyan
Write-Host "  Broker Service:     C:\vps-broker-service\" -ForegroundColor White
Write-Host "  Price Feeder:       C:\imperial-price-feeder\" -ForegroundColor White
Write-Host "  MT5 Broker:         C:\MT5_BrokerService\" -ForegroundColor White
Write-Host "  MT5 Price Feeder:  C:\Program Files\MetaTrader 5\" -ForegroundColor White
Write-Host ""
Write-Host "NO SHARED FOLDERS - COMPLETE SEPARATION!" -ForegroundColor Green
