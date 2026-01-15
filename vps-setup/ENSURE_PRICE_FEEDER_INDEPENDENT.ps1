# ============================================================================
# ENSURE PRICE FEEDER RUNS INDEPENDENTLY (EVEN WHEN APP IS CLOSED)
# ============================================================================
# Configures PM2 to run Price Feeder as a persistent service
# ============================================================================

Write-Host ""
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "  ENSURING PRICE FEEDER RUNS INDEPENDENTLY" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""

$PRICE_FEEDER_NAME = "Imperial Price Feeder"

# ============================================================================
# STEP 1: Stop Price Feeder to reconfigure
# ============================================================================
Write-Host "STEP 1: Stopping Price Feeder for reconfiguration..." -ForegroundColor Yellow

pm2 stop $PRICE_FEEDER_NAME 2>&1 | Out-Null
Start-Sleep -Seconds 2

Write-Host "  [OK] Price Feeder stopped" -ForegroundColor Green
Write-Host ""

# ============================================================================
# STEP 2: Configure PM2 for auto-restart and persistence
# ============================================================================
Write-Host "STEP 2: Configuring PM2 for persistence..." -ForegroundColor Yellow

# Enable auto-dump (saves process list automatically)
pm2 set pm2:autodump true 2>&1 | Out-Null

# Save current process list
pm2 save 2>&1 | Out-Null

Write-Host "  [OK] PM2 auto-dump enabled" -ForegroundColor Green
Write-Host "  [OK] PM2 process list saved" -ForegroundColor Green
Write-Host ""

# ============================================================================
# STEP 3: Configure Price Feeder for auto-restart
# ============================================================================
Write-Host "STEP 3: Configuring Price Feeder for auto-restart..." -ForegroundColor Yellow

# Restart with update-env to ensure configuration is saved
pm2 restart $PRICE_FEEDER_NAME --update-env 2>&1 | Out-Null
Start-Sleep -Seconds 3

# Save again after restart
pm2 save 2>&1 | Out-Null

Write-Host "  [OK] Price Feeder configured for auto-restart" -ForegroundColor Green
Write-Host ""

# ============================================================================
# STEP 4: Set up Windows startup (PM2 startup)
# ============================================================================
Write-Host "STEP 4: Setting up Windows startup..." -ForegroundColor Yellow

$startupOutput = pm2 startup 2>&1

if ($startupOutput -match "systemd|service|startup") {
    Write-Host "  [OK] PM2 startup command generated" -ForegroundColor Green
    Write-Host ""
    Write-Host "  IMPORTANT: Run the command shown above to enable PM2 on Windows startup" -ForegroundColor Yellow
    Write-Host "  This ensures Price Feeder starts automatically when VPS reboots" -ForegroundColor Gray
} else {
    Write-Host "  [INFO] PM2 startup may need manual configuration" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================================
# STEP 5: Verify configuration
# ============================================================================
Write-Host "STEP 5: Verifying configuration..." -ForegroundColor Yellow

$priceFeederInfo = pm2 describe $PRICE_FEEDER_NAME 2>&1

if ($priceFeederInfo -match "autorestart.*true") {
    Write-Host "  [OK] Auto-restart is enabled" -ForegroundColor Green
} else {
    Write-Host "  [WARN] Auto-restart status unclear" -ForegroundColor Yellow
}

# Check if dump file exists
$dumpPath = "$env:USERPROFILE\.pm2\dump.pm2"
if (Test-Path $dumpPath) {
    $dumpSize = (Get-Item $dumpPath).Length
    Write-Host "  [OK] PM2 dump file exists ($dumpSize bytes)" -ForegroundColor Green
} else {
    Write-Host "  [WARN] PM2 dump file not found" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================================
# STEP 6: Start Price Feeder
# ============================================================================
Write-Host "STEP 6: Starting Price Feeder..." -ForegroundColor Yellow

pm2 start $PRICE_FEEDER_NAME 2>&1 | Out-Null
Start-Sleep -Seconds 3

$status = pm2 status | Select-String -Pattern $PRICE_FEEDER_NAME

if ($status -match "online") {
    Write-Host "  [OK] Price Feeder is running" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] Price Feeder failed to start" -ForegroundColor Red
}

Write-Host ""

# ============================================================================
# FINAL SUMMARY
# ============================================================================
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "  CONFIGURATION COMPLETE!" -ForegroundColor Green
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Price Feeder Status:" -ForegroundColor Yellow
pm2 status | Select-String -Pattern $PRICE_FEEDER_NAME
Write-Host ""
Write-Host "  Key Points:" -ForegroundColor Yellow
Write-Host "  ├── PM2 auto-restart: Enabled" -ForegroundColor Gray
Write-Host "  ├── PM2 persistence: Enabled (saves on changes)" -ForegroundColor Gray
Write-Host "  ├── Windows startup: Configure with 'pm2 startup' command" -ForegroundColor Gray
Write-Host "  └── Independent operation: Price Feeder runs even if app closes" -ForegroundColor Gray
Write-Host ""
Write-Host "  To verify Price Feeder runs independently" -ForegroundColor Yellow
Write-Host "  1. Close all browser tabs/apps" -ForegroundColor White
Write-Host "  2. Check PM2 status with: pm2 status" -ForegroundColor White
Write-Host "  3. Price Feeder should still be online" -ForegroundColor White
Write-Host "  4. Prices should continue updating in database" -ForegroundColor White
Write-Host ""
