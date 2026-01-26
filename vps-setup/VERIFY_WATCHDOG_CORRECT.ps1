# ============================================================================
# VERIFY WATCHDOG IS IN CORRECT LOCATION AND MONITORING PRICE FEEDER
# ============================================================================

Write-Host ""
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "  VERIFYING WATCHDOG CONFIGURATION" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""

$PRICE_FEEDER_PM2_NAME = "Imperial Price Feeder"
$CORRECT_WATCHDOG_PATH = "C:\imperial-price-feeder\watchdogs\price-feeder-watchdog.js"
$BACKUP_WATCHDOG_PATH = "C:\vps-broker-service\vps-setup\imperial-watchdogs\price-feeder-watchdog.js"

# ============================================================================
# STEP 1: Verify Price Feeder PM2 name
# ============================================================================
Write-Host "STEP 1: Verifying Price Feeder PM2 process..." -ForegroundColor Yellow

$priceFeederStatus = pm2 status | Select-String -Pattern $PRICE_FEEDER_PM2_NAME

if ($priceFeederStatus) {
    Write-Host "  [OK] Price Feeder found in PM2" -ForegroundColor Green
    Write-Host "       Name: $PRICE_FEEDER_PM2_NAME" -ForegroundColor Gray
    $priceFeederStatus
} else {
    Write-Host "  [ERROR] Price Feeder NOT FOUND in PM2!" -ForegroundColor Red
    Write-Host "         Expected name: $PRICE_FEEDER_PM2_NAME" -ForegroundColor Gray
    exit 1
}

Write-Host ""

# ============================================================================
# STEP 2: Check watchdog script locations
# ============================================================================
Write-Host "STEP 2: Checking watchdog script locations..." -ForegroundColor Yellow

$watchdogFound = $false
$watchdogPath = $null

if (Test-Path $CORRECT_WATCHDOG_PATH) {
    $watchdogPath = $CORRECT_WATCHDOG_PATH
    $watchdogFound = $true
    Write-Host "  [OK] Watchdog at CORRECT location: $CORRECT_WATCHDOG_PATH" -ForegroundColor Green
} elseif (Test-Path $BACKUP_WATCHDOG_PATH) {
    $watchdogPath = $BACKUP_WATCHDOG_PATH
    $watchdogFound = $true
    Write-Host "  [WARN] Watchdog at backup location: $BACKUP_WATCHDOG_PATH" -ForegroundColor Yellow
    Write-Host "         Should be moved to: $CORRECT_WATCHDOG_PATH" -ForegroundColor Gray
} else {
    Write-Host "  [ERROR] Watchdog script NOT FOUND!" -ForegroundColor Red
    Write-Host "         Checked: $CORRECT_WATCHDOG_PATH" -ForegroundColor Gray
    Write-Host "         Checked: $BACKUP_WATCHDOG_PATH" -ForegroundColor Gray
    exit 1
}

Write-Host ""

# ============================================================================
# STEP 3: Verify watchdog monitors correct process
# ============================================================================
Write-Host "STEP 3: Verifying watchdog monitors correct process..." -ForegroundColor Yellow

if ($watchdogPath) {
    $content = Get-Content $watchdogPath -Raw
    
    if ($content -match "PRICE_FEEDER_NAME\s*=\s*['\`"]$PRICE_FEEDER_PM2_NAME['\`"]") {
        Write-Host "  [OK] Watchdog is configured to monitor: $PRICE_FEEDER_PM2_NAME" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] Watchdog is NOT monitoring the correct process!" -ForegroundColor Red
        $foundName = $content | Select-String -Pattern "PRICE_FEEDER_NAME\s*=\s*['\`"]([^'\`"]+)['\`"]"
        if ($foundName) {
            Write-Host "         Found: $($foundName.Matches.Groups[1].Value)" -ForegroundColor Gray
            Write-Host "         Expected: $PRICE_FEEDER_PM2_NAME" -ForegroundColor Gray
        }
        exit 1
    }
    
    # Check check interval
    if ($content -match "CHECK_INTERVAL\s*=\s*10000") {
        Write-Host "  [OK] Check interval: 10 seconds (fast restart)" -ForegroundColor Green
    } else {
        Write-Host "  [WARN] Check interval may not be optimized" -ForegroundColor Yellow
    }
    
    # Check max failures
    if ($content -match "MAX_CONSECUTIVE_FAILURES\s*=\s*1") {
        Write-Host "  [OK] Restart threshold: 1 failure (immediate restart)" -ForegroundColor Green
    } else {
        Write-Host "  [WARN] Restart threshold may not be optimized" -ForegroundColor Yellow
    }
}

Write-Host ""

# ============================================================================
# STEP 4: Ensure watchdog is in correct location
# ============================================================================
Write-Host "STEP 4: Ensuring watchdog is in correct location..." -ForegroundColor Yellow

if ($watchdogPath -ne $CORRECT_WATCHDOG_PATH) {
    Write-Host "  [INFO] Moving watchdog to correct location..." -ForegroundColor Yellow
    
    $targetDir = Split-Path $CORRECT_WATCHDOG_PATH
    if (-not (Test-Path $targetDir)) {
        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
        Write-Host "  [OK] Created directory: $targetDir" -ForegroundColor Green
    }
    
    Copy-Item -Path $watchdogPath -Destination $CORRECT_WATCHDOG_PATH -Force
    Write-Host "  [OK] Watchdog moved to: $CORRECT_WATCHDOG_PATH" -ForegroundColor Green
    $watchdogPath = $CORRECT_WATCHDOG_PATH
} else {
    Write-Host "  [OK] Watchdog already in correct location" -ForegroundColor Green
}

Write-Host ""

# ============================================================================
# STEP 5: Check if watchdog is running in PM2
# ============================================================================
Write-Host "STEP 5: Checking if watchdog is running in PM2..." -ForegroundColor Yellow

$watchdogRunning = pm2 status | Select-String -Pattern "price-feeder-watchdog" -CaseSensitive:$false

if ($watchdogRunning) {
    Write-Host "  [OK] Watchdog is running in PM2" -ForegroundColor Green
    $watchdogRunning
} else {
    Write-Host "  [WARN] Watchdog is NOT running in PM2" -ForegroundColor Yellow
    Write-Host "         Starting watchdog..." -ForegroundColor Gray
    
    $watchdogDir = Split-Path $watchdogPath
    cd $watchdogDir
    
    pm2 delete price-feeder-watchdog 2>&1 | Out-Null
    Start-Sleep -Seconds 2
    
    pm2 start price-feeder-watchdog.js --name price-feeder-watchdog
    Start-Sleep -Seconds 3
    
    pm2 save
    
    $watchdogRunning = pm2 status | Select-String -Pattern "price-feeder-watchdog" -CaseSensitive:$false
    if ($watchdogRunning) {
        Write-Host "  [OK] Watchdog started successfully" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] Failed to start watchdog" -ForegroundColor Red
    }
}

Write-Host ""

# ============================================================================
# FINAL SUMMARY
# ============================================================================
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "  VERIFICATION COMPLETE!" -ForegroundColor Green
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Configuration Summary:" -ForegroundColor Yellow
Write-Host "  ├── Price Feeder PM2 Name: $PRICE_FEEDER_PM2_NAME" -ForegroundColor Gray
Write-Host "  ├── Watchdog Location: $CORRECT_WATCHDOG_PATH" -ForegroundColor Gray
Write-Host "  ├── Watchdog Monitoring: $PRICE_FEEDER_PM2_NAME" -ForegroundColor Gray
Write-Host "  ├── Check Interval: 10 seconds" -ForegroundColor Gray
Write-Host "  └── Restart Threshold: 1 failure (immediate)" -ForegroundColor Gray
Write-Host ""
Write-Host "  Status:" -ForegroundColor Yellow
pm2 status | Select-String -Pattern "Imperial Price Feeder|price-feeder-watchdog" -CaseSensitive:$false
Write-Host ""
