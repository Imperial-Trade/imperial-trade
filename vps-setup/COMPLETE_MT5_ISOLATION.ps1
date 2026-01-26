# ============================================================================
# COMPLETE MT5 ISOLATION - Two Separate Architectures
# ============================================================================
# 
# ARCHITECTURE:
# 
# 1. PRICE FEEDER (C:\MT5_PriceFeeder)
#    - Dedicated EC Markets MT5 instance
#    - Single account (81071266)
#    - Runs 24/7, never closes
#    - Streams live gold prices to Supabase
#    - PM2: Imperial Price Feeder
#
# 2. BROKER SERVICE (C:\MT5_BrokerService)
#    - Dedicated portable MT5 instance
#    - Handles 10,000+ user connections
#    - On-demand connections for Journal XX Pro
#    - PM2: imperial-trade-broker-service
#
# CRITICAL: Each has its OWN folder, OWN terminal64.exe, OWN data
#           They NEVER share anything!
# ============================================================================

Write-Host ""
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "  COMPLETE MT5 ISOLATION SETUP" -ForegroundColor Cyan
Write-Host "  Two Completely Separate Architectures" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Continue"

# Configuration
$MT5_SOURCE = "C:\Program Files\MetaTrader 5"
$EC_MARKETS_SOURCE = "C:\Program Files\EC Markets MetaTrader 5"
$PRICE_FEEDER_DIR = "C:\MT5_PriceFeeder"
$BROKER_SERVICE_DIR = "C:\MT5_BrokerService"

# ============================================================================
# STEP 1: Stop everything first
# ============================================================================
Write-Host "STEP 1: Stopping all services and MT5 processes..." -ForegroundColor Yellow

pm2 stop all 2>$null
Start-Sleep -Seconds 2

Get-Process terminal64 -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3

Write-Host "  [OK] All processes stopped" -ForegroundColor Green
Write-Host ""

# ============================================================================
# STEP 2: Create Price Feeder Directory (C:\MT5_PriceFeeder)
# ============================================================================
Write-Host "STEP 2: Setting up Price Feeder MT5 (C:\MT5_PriceFeeder)..." -ForegroundColor Yellow

# Use EC Markets MT5 as source for Price Feeder
$priceFeederSource = $EC_MARKETS_SOURCE
if (-not (Test-Path "$priceFeederSource\terminal64.exe")) {
    $priceFeederSource = $MT5_SOURCE
}

if (-not (Test-Path "$priceFeederSource\terminal64.exe")) {
    Write-Host "  [ERROR] No MT5 source found!" -ForegroundColor Red
    exit 1
}

# Create or clean Price Feeder directory
if (Test-Path $PRICE_FEEDER_DIR) {
    Write-Host "  Cleaning existing Price Feeder directory..." -ForegroundColor Gray
    Remove-Item -Path "$PRICE_FEEDER_DIR\*" -Recurse -Force -ErrorAction SilentlyContinue
} else {
    New-Item -ItemType Directory -Path $PRICE_FEEDER_DIR -Force | Out-Null
}

# Copy MT5 files
Write-Host "  Copying MT5 files from $priceFeederSource..." -ForegroundColor Gray
Copy-Item -Path "$priceFeederSource\*" -Destination $PRICE_FEEDER_DIR -Recurse -Force -ErrorAction SilentlyContinue

# Create portable.ini for Price Feeder
$portableIni = @"
; MetaTrader 5 Portable Mode - Price Feeder
; This instance is ONLY for streaming live prices
; Account: EC Markets 81071266
[Common]
DataPath=$PRICE_FEEDER_DIR
"@
$portableIni | Out-File -FilePath "$PRICE_FEEDER_DIR\portable.ini" -Encoding UTF8 -Force

# Create folder structure
$folders = @("$PRICE_FEEDER_DIR\MQL5", "$PRICE_FEEDER_DIR\Logs", "$PRICE_FEEDER_DIR\Config", "$PRICE_FEEDER_DIR\Profiles")
foreach ($f in $folders) { 
    if (-not (Test-Path $f)) { New-Item -ItemType Directory -Path $f -Force | Out-Null }
}

Write-Host "  [OK] Price Feeder directory ready: $PRICE_FEEDER_DIR" -ForegroundColor Green
Write-Host ""

# ============================================================================
# STEP 3: Create/Verify Broker Service Directory (C:\MT5_BrokerService)
# ============================================================================
Write-Host "STEP 3: Setting up Broker Service MT5 (C:\MT5_BrokerService)..." -ForegroundColor Yellow

if (-not (Test-Path "$BROKER_SERVICE_DIR\terminal64.exe")) {
    # Copy from source
    if (Test-Path $BROKER_SERVICE_DIR) {
        Remove-Item -Path "$BROKER_SERVICE_DIR\*" -Recurse -Force -ErrorAction SilentlyContinue
    } else {
        New-Item -ItemType Directory -Path $BROKER_SERVICE_DIR -Force | Out-Null
    }
    
    Write-Host "  Copying MT5 files from $MT5_SOURCE..." -ForegroundColor Gray
    Copy-Item -Path "$MT5_SOURCE\*" -Destination $BROKER_SERVICE_DIR -Recurse -Force -ErrorAction SilentlyContinue
}

# Create portable.ini for Broker Service
$portableIni = @"
; MetaTrader 5 Portable Mode - Broker Service
; This instance handles user connections (10,000+ users)
; Used by Journal XX Pro for trade syncing
[Common]
DataPath=$BROKER_SERVICE_DIR
"@
$portableIni | Out-File -FilePath "$BROKER_SERVICE_DIR\portable.ini" -Encoding UTF8 -Force

# Create folder structure
$folders = @("$BROKER_SERVICE_DIR\MQL5", "$BROKER_SERVICE_DIR\Logs", "$BROKER_SERVICE_DIR\Config", "$BROKER_SERVICE_DIR\Profiles")
foreach ($f in $folders) { 
    if (-not (Test-Path $f)) { New-Item -ItemType Directory -Path $f -Force | Out-Null }
}

Write-Host "  [OK] Broker Service directory ready: $BROKER_SERVICE_DIR" -ForegroundColor Green
Write-Host ""

# ============================================================================
# STEP 4: Create Desktop Shortcuts
# ============================================================================
Write-Host "STEP 4: Creating desktop shortcuts..." -ForegroundColor Yellow

$WshShell = New-Object -ComObject WScript.Shell

# Price Feeder shortcut
$shortcut1 = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\MT5_PriceFeeder.lnk")
$shortcut1.TargetPath = "$PRICE_FEEDER_DIR\terminal64.exe"
$shortcut1.Arguments = "/portable"
$shortcut1.WorkingDirectory = $PRICE_FEEDER_DIR
$shortcut1.Description = "MT5 Price Feeder (EC Markets) - Portable Mode"
$shortcut1.Save()

# Broker Service shortcut
$shortcut2 = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\MT5_BrokerService.lnk")
$shortcut2.TargetPath = "$BROKER_SERVICE_DIR\terminal64.exe"
$shortcut2.Arguments = "/portable"
$shortcut2.WorkingDirectory = $BROKER_SERVICE_DIR
$shortcut2.Description = "MT5 Broker Service - Portable Mode"
$shortcut2.Save()

Write-Host "  [OK] Desktop shortcuts created" -ForegroundColor Green
Write-Host ""

# ============================================================================
# STEP 5: Start MT5 instances
# ============================================================================
Write-Host "STEP 5: Starting MT5 instances in portable mode..." -ForegroundColor Yellow

# Start Price Feeder MT5
Write-Host "  Starting Price Feeder MT5..." -ForegroundColor Gray
Start-Process -FilePath "$PRICE_FEEDER_DIR\terminal64.exe" -ArgumentList "/portable" -WorkingDirectory $PRICE_FEEDER_DIR
Start-Sleep -Seconds 5

# Start Broker Service MT5
Write-Host "  Starting Broker Service MT5..." -ForegroundColor Gray
Start-Process -FilePath "$BROKER_SERVICE_DIR\terminal64.exe" -ArgumentList "/portable" -WorkingDirectory $BROKER_SERVICE_DIR
Start-Sleep -Seconds 5

Write-Host "  [OK] Both MT5 instances started" -ForegroundColor Green
Write-Host ""

# ============================================================================
# STEP 6: Restart PM2 services
# ============================================================================
Write-Host "STEP 6: Restarting PM2 services..." -ForegroundColor Yellow

pm2 restart all
Start-Sleep -Seconds 5

Write-Host "  [OK] PM2 services restarted" -ForegroundColor Green
Write-Host ""

# ============================================================================
# STEP 7: Verification
# ============================================================================
Write-Host "STEP 7: Verifying setup..." -ForegroundColor Yellow
Write-Host ""

# Check MT5 processes
$mt5Procs = Get-Process terminal64 -ErrorAction SilentlyContinue
Write-Host "  MT5 Processes:" -ForegroundColor Cyan

$hasPriceFeeder = $false
$hasBrokerService = $false

foreach ($proc in $mt5Procs) {
    if ($proc.Path -like "*MT5_PriceFeeder*") {
        Write-Host "    [OK] PRICE FEEDER: PID $($proc.Id)" -ForegroundColor Green
        $hasPriceFeeder = $true
    } elseif ($proc.Path -like "*MT5_BrokerService*") {
        Write-Host "    [OK] BROKER SERVICE: PID $($proc.Id)" -ForegroundColor Green
        $hasBrokerService = $true
    } else {
        Write-Host "    [?] OTHER: PID $($proc.Id) - $($proc.Path)" -ForegroundColor Yellow
    }
}

Write-Host ""
pm2 status
Write-Host ""

# ============================================================================
# FINAL SUMMARY
# ============================================================================
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "  COMPLETE ISOLATION STATUS" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""

if ($hasPriceFeeder) {
    Write-Host "  [OK] PRICE FEEDER MT5" -ForegroundColor Green
    Write-Host "       Location: $PRICE_FEEDER_DIR" -ForegroundColor Gray
    Write-Host "       Purpose: Stream live prices 24/7" -ForegroundColor Gray
    Write-Host "       Account: EC Markets (81071266)" -ForegroundColor Gray
} else {
    Write-Host "  [ERROR] PRICE FEEDER MT5 NOT RUNNING!" -ForegroundColor Red
    Write-Host "       Please start: $PRICE_FEEDER_DIR\terminal64.exe /portable" -ForegroundColor Yellow
}

Write-Host ""

if ($hasBrokerService) {
    Write-Host "  [OK] BROKER SERVICE MT5" -ForegroundColor Green
    Write-Host "       Location: $BROKER_SERVICE_DIR" -ForegroundColor Gray
    Write-Host "       Purpose: Handle 10,000+ user connections" -ForegroundColor Gray
    Write-Host "       Used by: Journal XX Pro" -ForegroundColor Gray
} else {
    Write-Host "  [ERROR] BROKER SERVICE MT5 NOT RUNNING!" -ForegroundColor Red
    Write-Host "       Please start: $BROKER_SERVICE_DIR\terminal64.exe /portable" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "  ARCHITECTURE DIAGRAM" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  C:\MT5_PriceFeeder\                   C:\MT5_BrokerService\" -ForegroundColor White
Write-Host "  +---------------------------+         +---------------------------+" -ForegroundColor Gray
Write-Host "  | terminal64.exe            |         | terminal64.exe            |" -ForegroundColor Gray
Write-Host "  | portable.ini              |         | portable.ini              |" -ForegroundColor Gray
Write-Host "  | MQL5\                     |         | MQL5\                     |" -ForegroundColor Gray
Write-Host "  | Logs\                     |         | Logs\                     |" -ForegroundColor Gray
Write-Host "  | Config\                   |         | Config\                   |" -ForegroundColor Gray
Write-Host "  +---------------------------+         +---------------------------+" -ForegroundColor Gray
Write-Host "           |                                      |" -ForegroundColor Gray
Write-Host "           v                                      v" -ForegroundColor Gray
Write-Host "  +---------------------------+         +---------------------------+" -ForegroundColor Gray
Write-Host "  | Imperial Price Feeder     |         | Broker Service            |" -ForegroundColor Gray
Write-Host "  | (PM2 id: 0)               |         | (PM2 id: 1)               |" -ForegroundColor Gray
Write-Host "  | Streams prices to         |         | Handles user connections  |" -ForegroundColor Gray
Write-Host "  | Supabase 24/7             |         | for Journal XX Pro        |" -ForegroundColor Gray
Write-Host "  +---------------------------+         +---------------------------+" -ForegroundColor Gray
Write-Host ""
Write-Host "  ISOLATION: Each MT5 has its own:" -ForegroundColor Yellow
Write-Host "  - terminal64.exe (separate executable)" -ForegroundColor Gray
Write-Host "  - portable.ini (forces portable mode)" -ForegroundColor Gray
Write-Host "  - Data folder (no AppData sharing)" -ForegroundColor Gray
Write-Host "  - File locks (no conflicts)" -ForegroundColor Gray
Write-Host ""
Write-Host "  They NEVER interfere with each other!" -ForegroundColor Green
Write-Host ""
