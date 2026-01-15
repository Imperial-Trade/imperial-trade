# ============================================================================
# FIX MT5 PROCESSES - ENSURE ONLY 2 RUNNING (PRICE FEEDER + BROKER SERVICE)
# ============================================================================

Write-Host ""
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "  FIXING MT5 PROCESSES" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""

$PRICE_FEEDER_MT5_PATH = "C:\MT5_PriceFeeder\terminal64.exe"
$BROKER_SERVICE_MT5_PATH = "C:\MT5_BrokerService\terminal64.exe"

# ============================================================================
# STEP 1: Check current MT5 processes
# ============================================================================
Write-Host "STEP 1: Checking current MT5 processes..." -ForegroundColor Yellow

$allMT5 = Get-Process terminal64 -ErrorAction SilentlyContinue
$priceFeederMT5 = $allMT5 | Where-Object { $_.Path -like '*MT5_PriceFeeder*' }
$brokerServiceMT5 = $allMT5 | Where-Object { $_.Path -like '*MT5_BrokerService*' }
$otherMT5 = $allMT5 | Where-Object { $_.Path -notlike '*MT5_PriceFeeder*' -and $_.Path -notlike '*MT5_BrokerService*' }

Write-Host "  Price Feeder MT5: $($priceFeederMT5.Count)" -ForegroundColor Gray
Write-Host "  Broker Service MT5: $($brokerServiceMT5.Count)" -ForegroundColor Gray
Write-Host "  Other MT5: $($otherMT5.Count)" -ForegroundColor Gray
Write-Host ""

# ============================================================================
# STEP 2: Close extra MT5 processes
# ============================================================================
Write-Host "STEP 2: Closing extra MT5 processes..." -ForegroundColor Yellow

if ($otherMT5.Count -gt 0) {
    foreach ($proc in $otherMT5) {
        Write-Host "  [CLOSING] PID $($proc.Id) - $($proc.Path)" -ForegroundColor Yellow
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 3
    Write-Host "  [OK] Extra MT5 processes closed" -ForegroundColor Green
} else {
    Write-Host "  [OK] No extra MT5 processes found" -ForegroundColor Green
}

Write-Host ""

# ============================================================================
# STEP 3: Ensure Price Feeder MT5 is running
# ============================================================================
Write-Host "STEP 3: Ensuring Price Feeder MT5 is running..." -ForegroundColor Yellow

$priceFeederMT5 = Get-Process terminal64 -ErrorAction SilentlyContinue | Where-Object { $_.Path -like '*MT5_PriceFeeder*' }

if ($priceFeederMT5.Count -eq 0) {
    if (Test-Path $PRICE_FEEDER_MT5_PATH) {
        Write-Host "  [STARTING] Price Feeder MT5..." -ForegroundColor Yellow
        Start-Process -FilePath $PRICE_FEEDER_MT5_PATH -WindowStyle Normal
        Start-Sleep -Seconds 5
        Write-Host "  [OK] Price Feeder MT5 started" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] Price Feeder MT5 not found at: $PRICE_FEEDER_MT5_PATH" -ForegroundColor Red
    }
} else {
    Write-Host "  [OK] Price Feeder MT5 is running (PID: $($priceFeederMT5[0].Id))" -ForegroundColor Green
}

Write-Host ""

# ============================================================================
# STEP 4: Verify Broker Service MT5 (should start automatically when needed)
# ============================================================================
Write-Host "STEP 4: Checking Broker Service MT5..." -ForegroundColor Yellow

$brokerServiceMT5 = Get-Process terminal64 -ErrorAction SilentlyContinue | Where-Object { $_.Path -like '*MT5_BrokerService*' }

if ($brokerServiceMT5.Count -gt 0) {
    Write-Host "  [OK] Broker Service MT5 is running (PID: $($brokerServiceMT5[0].Id))" -ForegroundColor Green
} else {
    Write-Host "  [INFO] Broker Service MT5 not running (will start automatically when needed)" -ForegroundColor Gray
}

Write-Host ""

# ============================================================================
# FINAL SUMMARY
# ============================================================================
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "  FINAL STATUS" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""

$finalMT5 = Get-Process terminal64 -ErrorAction SilentlyContinue
$finalCount = $finalMT5.Count

Write-Host "  Total MT5 Processes: $finalCount" -ForegroundColor Yellow

if ($finalCount -eq 2) {
    Write-Host "  [OK] Correct: 2 MT5 processes (Price Feeder + Broker Service)" -ForegroundColor Green
} elseif ($finalCount -eq 1) {
    $mt5Path = $finalMT5[0].Path
    if ($mt5Path -like '*MT5_PriceFeeder*') {
        Write-Host "  [OK] Price Feeder MT5 running (Broker Service will start when needed)" -ForegroundColor Green
    } else {
        Write-Host "  [WARN] Only 1 MT5 running, but it's not Price Feeder" -ForegroundColor Yellow
    }
} else {
    Write-Host "  [WARN] Expected 1-2 MT5 processes, found $finalCount" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "  MT5 Processes:" -ForegroundColor Yellow
$finalMT5 | Select-Object Id, @{Name='Path';Expression={$_.Path}} | Format-Table -AutoSize

Write-Host ""
Write-Host "  PM2 Processes (should be 3):" -ForegroundColor Yellow
Write-Host "    - Imperial Price Feeder (Price streaming)" -ForegroundColor Gray
Write-Host "    - imperial-trade-broker-service (Journal sync)" -ForegroundColor Gray
Write-Host "    - price-feeder-watchdog (24/7 monitoring)" -ForegroundColor Gray
Write-Host ""
