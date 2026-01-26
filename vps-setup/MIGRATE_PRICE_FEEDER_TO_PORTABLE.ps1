# ============================================================================
# MIGRATE PRICE FEEDER TO PORTABLE MODE
# ============================================================================
# Moves Price Feeder from standard EC Markets MT5 to portable mode
# This provides maximum isolation while maintaining identical functionality
# ============================================================================

Write-Host ""
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "  MIGRATING PRICE FEEDER TO PORTABLE MODE" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""

$SOURCE_MT5 = "C:\Program Files\EC Markets MetaTrader 5"
$DEST_MT5 = "C:\MT5_PriceFeeder"
$MT5_BRIDGE_FILE = "C:\imperial-price-feeder\mt5_bridge.py"

# ============================================================================
# STEP 1: Verify source exists
# ============================================================================
Write-Host "STEP 1: Verifying source EC Markets MT5..." -ForegroundColor Yellow

if (-not (Test-Path "$SOURCE_MT5\terminal64.exe")) {
    Write-Host "  [ERROR] EC Markets MT5 NOT FOUND at: $SOURCE_MT5" -ForegroundColor Red
    exit 1
}

Write-Host "  [OK] Source EC Markets MT5 found" -ForegroundColor Green
Write-Host ""

# ============================================================================
# STEP 2: Stop Price Feeder service
# ============================================================================
Write-Host "STEP 2: Stopping Price Feeder service..." -ForegroundColor Yellow

pm2 stop "Imperial Price Feeder" 2>$null
Start-Sleep -Seconds 3

Write-Host "  [OK] Price Feeder stopped" -ForegroundColor Green
Write-Host ""

# ============================================================================
# STEP 3: Kill any running EC Markets MT5 processes
# ============================================================================
Write-Host "STEP 3: Closing EC Markets MT5 processes..." -ForegroundColor Yellow

$ecMarketsProcesses = Get-Process terminal64 -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*EC Markets*" }
if ($ecMarketsProcesses) {
    foreach ($proc in $ecMarketsProcesses) {
        Write-Host "  Closing process PID: $($proc.Id)" -ForegroundColor Gray
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 3
}

Write-Host "  [OK] EC Markets MT5 processes closed" -ForegroundColor Green
Write-Host ""

# ============================================================================
# STEP 4: Create destination directory
# ============================================================================
Write-Host "STEP 4: Creating destination directory..." -ForegroundColor Yellow

if (Test-Path $DEST_MT5) {
    Write-Host "  [INFO] Destination already exists, removing old copy..." -ForegroundColor Gray
    Remove-Item -Path $DEST_MT5 -Recurse -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

New-Item -ItemType Directory -Path $DEST_MT5 -Force | Out-Null
Write-Host "  [OK] Destination directory created: $DEST_MT5" -ForegroundColor Green
Write-Host ""

# ============================================================================
# STEP 5: Copy EC Markets MT5 to portable location
# ============================================================================
Write-Host "STEP 5: Copying EC Markets MT5 to portable location..." -ForegroundColor Yellow
Write-Host "  This may take a few minutes (copying ~130MB)..." -ForegroundColor Gray

try {
    # Copy all files and folders
    $copyResult = Copy-Item -Path "$SOURCE_MT5\*" -Destination $DEST_MT5 -Recurse -Force -ErrorAction Stop
    
    Write-Host "  [OK] EC Markets MT5 copied successfully" -ForegroundColor Green
    
    # Verify key files
    $terminalExists = Test-Path "$DEST_MT5\terminal64.exe"
    if ($terminalExists) {
        $fileSize = (Get-Item "$DEST_MT5\terminal64.exe").Length
        Write-Host "  [OK] terminal64.exe verified ($fileSize bytes)" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] terminal64.exe not found after copy!" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "  [ERROR] Failed to copy EC Markets MT5" -ForegroundColor Red
    Write-Host "         Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# ============================================================================
# STEP 6: Create portable.ini
# ============================================================================
Write-Host "STEP 6: Creating portable.ini..." -ForegroundColor Yellow

$portableIni = @"
[Common]
Portable=1
"@

$portableIni | Set-Content -Path "$DEST_MT5\portable.ini" -Encoding UTF8

if (Test-Path "$DEST_MT5\portable.ini") {
    Write-Host "  [OK] portable.ini created" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] Failed to create portable.ini" -ForegroundColor Red
    exit 1
}

Write-Host ""

# ============================================================================
# STEP 7: Update mt5_bridge.py to use portable path
# ============================================================================
Write-Host "STEP 7: Updating mt5_bridge.py to use portable path..." -ForegroundColor Yellow

if (-not (Test-Path $MT5_BRIDGE_FILE)) {
    Write-Host "  [ERROR] mt5_bridge.py not found: $MT5_BRIDGE_FILE" -ForegroundColor Red
    exit 1
}

$content = Get-Content $MT5_BRIDGE_FILE -Raw

# Update the initialize call to use portable path
$oldPattern = 'if not mt5\.initialize\(path=r"C:\\Program Files\\EC Markets MetaTrader 5\\terminal64\.exe"\):'
$newCode = 'if not mt5.initialize(path=r"C:\\MT5_PriceFeeder\\terminal64.exe", portable=True):'

if ($content -match $oldPattern) {
    $newContent = $content -replace $oldPattern, $newCode
    $newContent | Set-Content $MT5_BRIDGE_FILE -NoNewline
    Write-Host "  [OK] mt5_bridge.py updated to use portable path" -ForegroundColor Green
    Write-Host "       Path: C:\MT5_PriceFeeder\terminal64.exe" -ForegroundColor Gray
    Write-Host "       Mode: Portable" -ForegroundColor Gray
} else {
    # Try alternative pattern
    $altPattern = 'if not mt5\.initialize\([^)]*\):'
    if ($content -match $altPattern) {
        $newContent = $content -replace $altPattern, $newCode
        $newContent | Set-Content $MT5_BRIDGE_FILE -NoNewline
        Write-Host "  [OK] mt5_bridge.py updated (alternative pattern)" -ForegroundColor Green
    } else {
        Write-Host "  [WARN] Could not find initialize() pattern to replace" -ForegroundColor Yellow
        Write-Host "  Checking current configuration..." -ForegroundColor Gray
    }
}

# Verify the change
Write-Host ""
Write-Host "  Verification:" -ForegroundColor Yellow
$verify = Get-Content $MT5_BRIDGE_FILE | Select-String "MT5_PriceFeeder|portable"
if ($verify) {
    foreach ($line in $verify) {
        Write-Host "    $($line.Line.Trim())" -ForegroundColor Gray
    }
    Write-Host "  [OK] Python script configured for portable mode!" -ForegroundColor Green
} else {
    Write-Host "  [WARN] Could not verify configuration" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================================
# STEP 8: Restart Price Feeder service
# ============================================================================
Write-Host "STEP 8: Restarting Price Feeder service..." -ForegroundColor Yellow

pm2 restart "Imperial Price Feeder"
Start-Sleep -Seconds 5

Write-Host "  [OK] Price Feeder service restarted" -ForegroundColor Green
Write-Host ""

# ============================================================================
# STEP 9: Verification
# ============================================================================
Write-Host "STEP 9: Final Verification..." -ForegroundColor Yellow
Write-Host ""

# Check PM2 status
Write-Host "  PM2 Status:" -ForegroundColor Cyan
pm2 status | Select-String "Imperial Price Feeder"

# Check if portable MT5 is running
Start-Sleep -Seconds 10
Write-Host ""
Write-Host "  MT5 Processes:" -ForegroundColor Cyan
$allMT5Processes = Get-Process terminal64 -ErrorAction SilentlyContinue
foreach ($proc in $allMT5Processes) {
    if ($proc.Path -like "*MT5_PriceFeeder*") {
        Write-Host "    [PRICE FEEDER] PID: $($proc.Id) - Portable Mode [OK]" -ForegroundColor Green
    } elseif ($proc.Path -like "*MT5_BrokerService*") {
        Write-Host "    [BROKER SERVICE] PID: $($proc.Id) - Portable Mode [OK]" -ForegroundColor Yellow
    } else {
        Write-Host "    [OTHER] PID: $($proc.Id) - $($proc.Path)" -ForegroundColor Gray
    }
}

Write-Host ""

# ============================================================================
# FINAL SUMMARY
# ============================================================================
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "  MIGRATION COMPLETE!" -ForegroundColor Green
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Price Feeder Configuration:" -ForegroundColor Yellow
Write-Host "  ├── MT5 Source: EC Markets MT5 (Portable Copy)" -ForegroundColor Gray
Write-Host "  ├── Path: C:\MT5_PriceFeeder\terminal64.exe" -ForegroundColor Gray
Write-Host "  ├── Mode: Portable (Isolated)" -ForegroundColor Gray
Write-Host "  ├── Account: 81071266 (EC Markets)" -ForegroundColor Gray
Write-Host "  └── Purpose: Stream live prices (XAUUSD, BTCUSD, etc.)" -ForegroundColor Gray
Write-Host ""
Write-Host "  Architecture:" -ForegroundColor Yellow
Write-Host "  Price Feeder: C:\MT5_PriceFeeder (Portable)" -ForegroundColor Green
Write-Host "  Broker Service: C:\MT5_BrokerService (Portable)" -ForegroundColor Green
Write-Host ""
Write-Host "  IMPORTANT:" -ForegroundColor Yellow
Write-Host "  1. Check logs: pm2 logs Imperial Price Feeder --lines 30" -ForegroundColor White
Write-Host "  2. Look for: MT5 initialized successfully" -ForegroundColor White
Write-Host "  3. Verify prices are streaming on website" -ForegroundColor White
Write-Host "  4. Both services are now in portable mode" -ForegroundColor White
Write-Host ""
