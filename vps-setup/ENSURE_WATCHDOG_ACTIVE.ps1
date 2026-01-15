# ============================================================================
# ENSURE PRICE FEEDER WATCHDOG IS ACTIVE
# ============================================================================
# Sets up and starts the watchdog to monitor Price Feeder 24/7
# ============================================================================

Write-Host ""
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "  ENSURING PRICE FEEDER WATCHDOG IS ACTIVE" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""

$WATCHDOG_NAME = "price-feeder-watchdog"
$WATCHDOG_SCRIPT = "C:\imperial-price-feeder\watchdogs\price-feeder-watchdog.js"
$ALT_WATCHDOG_SCRIPT = "C:\vps-broker-service\vps-setup\imperial-watchdogs\price-feeder-watchdog.js"

# ============================================================================
# STEP 1: Find watchdog script
# ============================================================================
Write-Host "STEP 1: Locating watchdog script..." -ForegroundColor Yellow

$watchdogPath = $null
if (Test-Path $WATCHDOG_SCRIPT) {
    $watchdogPath = $WATCHDOG_SCRIPT
    Write-Host "  [OK] Found at: $watchdogPath" -ForegroundColor Green
} elseif (Test-Path $ALT_WATCHDOG_SCRIPT) {
    $watchdogPath = $ALT_WATCHDOG_SCRIPT
    Write-Host "  [OK] Found at: $watchdogPath" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] Watchdog script NOT FOUND" -ForegroundColor Red
    Write-Host "         Checked: $WATCHDOG_SCRIPT" -ForegroundColor Gray
    Write-Host "         Checked: $ALT_WATCHDOG_SCRIPT" -ForegroundColor Gray
    exit 1
}

Write-Host ""

# ============================================================================
# STEP 2: Check if watchdog is already running
# ============================================================================
Write-Host "STEP 2: Checking if watchdog is already running..." -ForegroundColor Yellow

$watchdogRunning = pm2 list | Select-String -Pattern $WATCHDOG_NAME -CaseSensitive:$false

if ($watchdogRunning) {
    Write-Host "  [OK] Watchdog is already running in PM2" -ForegroundColor Green
    pm2 list | Select-String -Pattern $WATCHDOG_NAME -CaseSensitive:$false
    Write-Host ""
    exit 0
}

Write-Host "  [INFO] Watchdog not running, starting it..." -ForegroundColor Yellow
Write-Host ""

# ============================================================================
# STEP 3: Start watchdog in PM2
# ============================================================================
Write-Host "STEP 3: Starting watchdog in PM2..." -ForegroundColor Yellow

try {
    pm2 start $watchdogPath --name $WATCHDOG_NAME --no-autorestart
    
    Start-Sleep -Seconds 3
    
    $status = pm2 list | Select-String -Pattern $WATCHDOG_NAME -CaseSensitive:$false
    
    if ($status) {
        Write-Host "  [OK] Watchdog started successfully" -ForegroundColor Green
        pm2 list | Select-String -Pattern $WATCHDOG_NAME -CaseSensitive:$false
    } else {
        Write-Host "  [ERROR] Watchdog failed to start" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "  [ERROR] Failed to start watchdog: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# ============================================================================
# STEP 4: Save PM2 configuration
# ============================================================================
Write-Host "STEP 4: Saving PM2 configuration..." -ForegroundColor Yellow

pm2 save

Write-Host "  [OK] PM2 configuration saved" -ForegroundColor Green
Write-Host ""

# ============================================================================
# FINAL SUMMARY
# ============================================================================
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "  WATCHDOG SETUP COMPLETE!" -ForegroundColor Green
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Watchdog Status:" -ForegroundColor Yellow
Write-Host "  ├── Name: $WATCHDOG_NAME" -ForegroundColor Gray
Write-Host "  ├── Script: $watchdogPath" -ForegroundColor Gray
Write-Host "  ├── Check Interval: 30 seconds" -ForegroundColor Gray
Write-Host "  └── Auto-restart: Enabled" -ForegroundColor Gray
Write-Host ""
Write-Host "  What the watchdog does:" -ForegroundColor Yellow
Write-Host "  ├── Monitors Price Feeder every 30 seconds" -ForegroundColor Gray
Write-Host "  ├── Restarts Price Feeder if it stops" -ForegroundColor Gray
Write-Host "  └── Ensures 24/7 uptime" -ForegroundColor Gray
Write-Host ""
Write-Host "  IMPORTANT:" -ForegroundColor Yellow
Write-Host "  1. Watchdog will auto-start on VPS reboot" -ForegroundColor White
Write-Host "  2. Check status: pm2 status" -ForegroundColor White
Write-Host ""
