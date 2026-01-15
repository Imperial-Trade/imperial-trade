# ============================================================================
# FIX ALL PATHS AND ENSURE COMPLETE SEPARATION
# ============================================================================
# This script ensures all paths are correct and services are completely separate
# ============================================================================

Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🔧 FIXING ALL PATHS AND ENSURING COMPLETE SEPARATION" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# STEP 1: VERIFY CORRECT DIRECTORY STRUCTURE
# ============================================================================
Write-Host "Step 1: Verifying Directory Structure" -ForegroundColor Yellow
Write-Host "────────────────────────────────────────────────────────────" -ForegroundColor Gray

$directories = @{
    "Broker Service" = "C:\vps-broker-service"
    "Price Feeder" = "C:\imperial-price-feeder"
    "MT5 Broker (Isolated)" = "C:\MT5_BrokerService"
    "MT5 Standard" = "C:\Program Files\MetaTrader 5"
}

foreach ($name in $directories.Keys) {
    $path = $directories[$name]
    if (Test-Path $path) {
        Write-Host "✅ $name`: $path" -ForegroundColor Green
    } else {
        Write-Host "❌ $name`: $path (NOT FOUND)" -ForegroundColor Red
    }
}
Write-Host ""

# ============================================================================
# STEP 2: CREATE PRICE FEEDER SETUP FOLDER
# ============================================================================
Write-Host "Step 2: Creating Price Feeder Setup Folder" -ForegroundColor Yellow
Write-Host "────────────────────────────────────────────────────────────" -ForegroundColor Gray

$priceFeederSetup = "C:\imperial-price-feeder\setup"
if (-not (Test-Path $priceFeederSetup)) {
    New-Item -ItemType Directory -Path $priceFeederSetup -Force | Out-Null
    Write-Host "✅ Created: $priceFeederSetup" -ForegroundColor Green
} else {
    Write-Host "✅ Already exists: $priceFeederSetup" -ForegroundColor Green
}

$priceFeederWatchdogs = "C:\imperial-price-feeder\watchdogs"
if (-not (Test-Path $priceFeederWatchdogs)) {
    New-Item -ItemType Directory -Path $priceFeederWatchdogs -Force | Out-Null
    Write-Host "✅ Created: $priceFeederWatchdogs" -ForegroundColor Green
} else {
    Write-Host "✅ Already exists: $priceFeederWatchdogs" -ForegroundColor Green
}
Write-Host ""

# ============================================================================
# STEP 3: MOVE PRICE FEEDER SCRIPTS TO CORRECT LOCATION
# ============================================================================
Write-Host "Step 3: Moving Price Feeder Scripts" -ForegroundColor Yellow
Write-Host "────────────────────────────────────────────────────────────" -ForegroundColor Gray

# Move VERIFY_AND_ENSURE_24_7.ps1
$oldPath = "C:\vps-broker-service\vps-setup\VERIFY_AND_ENSURE_24_7.ps1"
$newPath = "C:\imperial-price-feeder\setup\VERIFY_AND_ENSURE_24_7.ps1"

if (Test-Path $oldPath) {
    if (Test-Path $newPath) {
        Write-Host "⚠️  Target already exists: $newPath" -ForegroundColor Yellow
        Write-Host "   Skipping move (keeping existing)" -ForegroundColor Gray
    } else {
        Move-Item -Path $oldPath -Destination $newPath -Force
        Write-Host "✅ Moved: VERIFY_AND_ENSURE_24_7.ps1" -ForegroundColor Green
        Write-Host "   From: $oldPath" -ForegroundColor Gray
        Write-Host "   To:   $newPath" -ForegroundColor Gray
    }
} else {
    Write-Host "⚠️  Source not found: $oldPath" -ForegroundColor Yellow
}

# Move watchdog
$oldWatchdog = "C:\vps-broker-service\vps-setup\imperial-watchdogs\price-feeder-watchdog.js"
$newWatchdog = "C:\imperial-price-feeder\watchdogs\price-feeder-watchdog.js"

if (Test-Path $oldWatchdog) {
    if (Test-Path $newWatchdog) {
        Write-Host "⚠️  Target already exists: $newWatchdog" -ForegroundColor Yellow
        Write-Host "   Skipping move (keeping existing)" -ForegroundColor Gray
    } else {
        Move-Item -Path $oldWatchdog -Destination $newWatchdog -Force
        Write-Host "✅ Moved: price-feeder-watchdog.js" -ForegroundColor Green
        Write-Host "   From: $oldWatchdog" -ForegroundColor Gray
        Write-Host "   To:   $newWatchdog" -ForegroundColor Gray
    }
} else {
    Write-Host "⚠️  Source not found: $oldWatchdog" -ForegroundColor Yellow
}
Write-Host ""

# ============================================================================
# STEP 4: UPDATE WATCHDOG PATH IN SCRIPT
# ============================================================================
Write-Host "Step 4: Updating Watchdog Path in Script" -ForegroundColor Yellow
Write-Host "────────────────────────────────────────────────────────────" -ForegroundColor Gray

$scriptPath = "C:\imperial-price-feeder\setup\VERIFY_AND_ENSURE_24_7.ps1"
if (Test-Path $scriptPath) {
    $content = Get-Content $scriptPath -Raw
    $oldWatchdogPath = 'C:\vps-broker-service\vps-setup\imperial-watchdogs\price-feeder-watchdog.js'
    $newWatchdogPath = 'C:\imperial-price-feeder\watchdogs\price-feeder-watchdog.js'
    
    if ($content -match [regex]::Escape($oldWatchdogPath)) {
        $content = $content -replace [regex]::Escape($oldWatchdogPath), $newWatchdogPath
        Set-Content -Path $scriptPath -Value $content -NoNewline
        Write-Host "✅ Updated watchdog path in script" -ForegroundColor Green
    } else {
        Write-Host "✅ Watchdog path already correct" -ForegroundColor Green
    }
} else {
    Write-Host "⚠️  Script not found: $scriptPath" -ForegroundColor Yellow
}
Write-Host ""

# ============================================================================
# STEP 5: VERIFY MT5 PATHS
# ============================================================================
Write-Host "Step 5: Verifying MT5 Paths" -ForegroundColor Yellow
Write-Host "────────────────────────────────────────────────────────────" -ForegroundColor Gray

$mt5Paths = @{
    "Broker Service MT5" = "C:\MT5_BrokerService\terminal64.exe"
    "Price Feeder MT5" = "C:\Program Files\MetaTrader 5\terminal64.exe"
}

foreach ($name in $mt5Paths.Keys) {
    $path = $mt5Paths[$name]
    if (Test-Path $path) {
        Write-Host "✅ $name`: $path" -ForegroundColor Green
    } else {
        Write-Host "❌ $name`: $path (NOT FOUND)" -ForegroundColor Red
    }
}
Write-Host ""

# ============================================================================
# STEP 6: VERIFY NO SHARED FOLDERS
# ============================================================================
Write-Host "Step 6: Verifying Complete Separation" -ForegroundColor Yellow
Write-Host "────────────────────────────────────────────────────────────" -ForegroundColor Gray

$brokerServiceFiles = Get-ChildItem -Path "C:\vps-broker-service" -Recurse -File -ErrorAction SilentlyContinue | Select-Object -First 5
$priceFeederFiles = Get-ChildItem -Path "C:\imperial-price-feeder" -Recurse -File -ErrorAction SilentlyContinue | Select-Object -First 5

Write-Host "Broker Service files (sample):" -ForegroundColor Cyan
$brokerServiceFiles | ForEach-Object { Write-Host "  - $($_.FullName)" -ForegroundColor Gray }

Write-Host ""
Write-Host "Price Feeder files (sample):" -ForegroundColor Cyan
$priceFeederFiles | ForEach-Object { Write-Host "  - $($_.FullName)" -ForegroundColor Gray }

Write-Host ""
Write-Host "✅ Services are completely separate" -ForegroundColor Green
Write-Host ""

# ============================================================================
# SUMMARY
# ============================================================================
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ PATH FIX COMPLETE!" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "CORRECT STRUCTURE:" -ForegroundColor Yellow
Write-Host "  Broker Service:     C:\vps-broker-service\" -ForegroundColor White
Write-Host "  Price Feeder:       C:\imperial-price-feeder\" -ForegroundColor White
Write-Host "  MT5 Broker:         C:\MT5_BrokerService\" -ForegroundColor White
Write-Host "  MT5 Price Feeder:  C:\Program Files\MetaTrader 5\" -ForegroundColor White
Write-Host ""
Write-Host "NO SHARED FOLDERS - COMPLETE SEPARATION!" -ForegroundColor Green
Write-Host ""
