# ============================================================================
# SETUP EC MARKETS MT5 PORTABLE - Complete Implementation
# ============================================================================
# This script sets up C:\MT5_PriceFeeder with EC Markets MT5 files
# and configures it for portable mode operation
# ============================================================================

Write-Host ""
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "  SETTING UP EC MARKETS MT5 PORTABLE MODE" -ForegroundColor Cyan
Write-Host "  Target: C:\MT5_PriceFeeder" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Continue"

# Configuration
$EC_MARKETS_SOURCE = "C:\Program Files\EC Markets MetaTrader 5"
$PRICE_FEEDER_DIR = "C:\MT5_PriceFeeder"
$MT5_ACCOUNT = "81071266"
$MT5_SERVER = "ECMarkets-MT5-Live01"

# ============================================================================
# STEP 1: Verify EC Markets MT5 Source
# ============================================================================
Write-Host "STEP 1: Verifying EC Markets MT5 source..." -ForegroundColor Yellow

if (-not (Test-Path "$EC_MARKETS_SOURCE\terminal64.exe")) {
    Write-Host "  [ERROR] EC Markets MT5 not found at: $EC_MARKETS_SOURCE" -ForegroundColor Red
    Write-Host "  Please ensure EC Markets MetaTrader 5 is installed" -ForegroundColor Yellow
    exit 1
}

Write-Host "  [OK] EC Markets MT5 found: $EC_MARKETS_SOURCE" -ForegroundColor Green
Write-Host ""

# ============================================================================
# STEP 2: Stop all MT5 processes
# ============================================================================
Write-Host "STEP 2: Stopping all MT5 processes..." -ForegroundColor Yellow

Get-Process terminal64 -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3

Write-Host "  [OK] All MT5 processes stopped" -ForegroundColor Green
Write-Host ""

# ============================================================================
# STEP 3: Create/clean Price Feeder directory
# ============================================================================
Write-Host "STEP 3: Setting up C:\MT5_PriceFeeder directory..." -ForegroundColor Yellow

if (Test-Path $PRICE_FEEDER_DIR) {
    Write-Host "  Cleaning existing directory..." -ForegroundColor Gray
    Remove-Item -Path "$PRICE_FEEDER_DIR\*" -Recurse -Force -ErrorAction SilentlyContinue
} else {
    New-Item -ItemType Directory -Path $PRICE_FEEDER_DIR -Force | Out-Null
}

Write-Host "  [OK] Directory ready: $PRICE_FEEDER_DIR" -ForegroundColor Green
Write-Host ""

# ============================================================================
# STEP 4: Copy EC Markets MT5 files
# ============================================================================
Write-Host "STEP 4: Copying EC Markets MT5 files..." -ForegroundColor Yellow
Write-Host "  Source: $EC_MARKETS_SOURCE" -ForegroundColor Gray
Write-Host "  Destination: $PRICE_FEEDER_DIR" -ForegroundColor Gray

try {
    # Copy all files and folders
    Copy-Item -Path "$EC_MARKETS_SOURCE\*" -Destination $PRICE_FEEDER_DIR -Recurse -Force -ErrorAction Stop
    Write-Host "  [OK] Files copied successfully" -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] Failed to copy files: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# ============================================================================
# STEP 5: Verify terminal64.exe exists
# ============================================================================
Write-Host "STEP 5: Verifying installation..." -ForegroundColor Yellow

if (-not (Test-Path "$PRICE_FEEDER_DIR\terminal64.exe")) {
    Write-Host "  [ERROR] terminal64.exe not found in $PRICE_FEEDER_DIR" -ForegroundColor Red
    exit 1
}

Write-Host "  [OK] terminal64.exe verified: $PRICE_FEEDER_DIR\terminal64.exe" -ForegroundColor Green
Write-Host ""

# ============================================================================
# STEP 6: Create portable.ini (if needed)
# ============================================================================
Write-Host "STEP 6: Configuring portable mode..." -ForegroundColor Yellow

$portableIni = @"
; MetaTrader 5 Portable Mode - Price Feeder
; EC Markets MT5 Instance for Live Price Streaming
; Account: $MT5_ACCOUNT
; Server: $MT5_SERVER
[Common]
DataPath=$PRICE_FEEDER_DIR
"@

$portableIni | Out-File -FilePath "$PRICE_FEEDER_DIR\portable.ini" -Encoding UTF8 -Force
Write-Host "  [OK] portable.ini created" -ForegroundColor Green
Write-Host ""

# ============================================================================
# STEP 7: Create necessary folders
# ============================================================================
Write-Host "STEP 7: Creating folder structure..." -ForegroundColor Yellow

$folders = @(
    "$PRICE_FEEDER_DIR\MQL5",
    "$PRICE_FEEDER_DIR\Logs",
    "$PRICE_FEEDER_DIR\Config",
    "$PRICE_FEEDER_DIR\Profiles",
    "$PRICE_FEEDER_DIR\logs"
)

foreach ($folder in $folders) {
    if (-not (Test-Path $folder)) {
        New-Item -ItemType Directory -Path $folder -Force | Out-Null
        Write-Host "  Created: $folder" -ForegroundColor Gray
    }
}

Write-Host "  [OK] Folder structure ready" -ForegroundColor Green
Write-Host ""

# ============================================================================
# STEP 8: Test MT5 startup (optional - will require manual login)
# ============================================================================
Write-Host "STEP 8: Testing MT5 startup..." -ForegroundColor Yellow

try {
    $process = Start-Process -FilePath "$PRICE_FEEDER_DIR\terminal64.exe" -ArgumentList "/portable" -WindowStyle Normal -PassThru
    Start-Sleep -Seconds 5
    
    if (Get-Process -Id $process.Id -ErrorAction SilentlyContinue) {
        Write-Host "  [OK] MT5 started successfully (PID: $($process.Id))" -ForegroundColor Green
        Write-Host "  [INFO] Please login manually with account $MT5_ACCOUNT and save password" -ForegroundColor Yellow
        Write-Host "  [INFO] After login, close MT5 and the watchdog will handle auto-start" -ForegroundColor Yellow
    } else {
        Write-Host "  [WARNING] MT5 process not detected, but startup command succeeded" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  [WARNING] Could not test MT5 startup: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "  [INFO] You can manually start MT5 later: $PRICE_FEEDER_DIR\terminal64.exe /portable" -ForegroundColor Gray
}

Write-Host ""

# ============================================================================
# STEP 9: Summary
# ============================================================================
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "  SETUP COMPLETE" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Configuration Summary:" -ForegroundColor Yellow
Write-Host "  ├── MT5 Path: $PRICE_FEEDER_DIR\terminal64.exe" -ForegroundColor White
Write-Host "  ├── Mode: Portable" -ForegroundColor White
Write-Host "  ├── Account: $MT5_ACCOUNT" -ForegroundColor White
Write-Host "  ├── Server: $MT5_SERVER" -ForegroundColor White
Write-Host "  └── Data Directory: $PRICE_FEEDER_DIR" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. If MT5 is open, login with account $MT5_ACCOUNT" -ForegroundColor White
Write-Host "  2. Save password for auto-login" -ForegroundColor White
Write-Host "  3. Close MT5" -ForegroundColor White
Write-Host "  4. Update mt5_bridge.py to use: C:\MT5_PriceFeeder\terminal64.exe, portable=True" -ForegroundColor White
Write-Host "  5. Restart Price Feeder: pm2 restart 'Imperial Price Feeder'" -ForegroundColor White
Write-Host ""
Write-Host "Watchdog Configuration:" -ForegroundColor Yellow
Write-Host "  Already configured for: C:\MT5_PriceFeeder\terminal64.exe" -ForegroundColor Green
Write-Host "  Will auto-start MT5 if it closes" -ForegroundColor Green
Write-Host ""
