# ============================================================================
# VERIFY WATCHDOGS ARE WORKING
# ============================================================================

Write-Host ""
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "  VERIFYING WATCHDOGS ARE WORKING" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# STEP 1: Verify All Services Running
# ============================================================================
Write-Host "STEP 1: Current Status..." -ForegroundColor Yellow

$redis = Get-Process redis-server -ErrorAction SilentlyContinue
$mt5 = Get-Process terminal64 -ErrorAction SilentlyContinue | Where-Object { $_.Path -match "MT5_PriceFeeder" }
$priceFeeder = pm2 list | Select-String "Imperial Price Feeder"

Write-Host "  Redis: " -NoNewline
if ($redis) {
    Write-Host "✅ Running (PID: $($redis.Id))" -ForegroundColor Green
} else {
    Write-Host "❌ NOT RUNNING" -ForegroundColor Red
}

Write-Host "  MT5 Price Feeder: " -NoNewline
if ($mt5) {
    Write-Host "✅ Running (PID: $($mt5.Id))" -ForegroundColor Green
} else {
    Write-Host "❌ NOT RUNNING" -ForegroundColor Red
}

Write-Host "  Price Feeder Service: " -NoNewline
if ($priceFeeder) {
    Write-Host "✅ Running" -ForegroundColor Green
} else {
    Write-Host "❌ NOT RUNNING" -ForegroundColor Red
}

# ============================================================================
# STEP 2: Test Redis Watchdog
# ============================================================================
Write-Host ""
Write-Host "STEP 2: Testing Redis Watchdog..." -ForegroundColor Yellow

if ($redis) {
    Write-Host "  Stopping Redis to test watchdog..." -ForegroundColor Gray
    Stop-Process -Id $redis.Id -Force
    Start-Sleep -Seconds 2
    
    Write-Host "  Waiting 20 seconds for watchdog to restart Redis..." -ForegroundColor Gray
    Start-Sleep -Seconds 20
    
    $redisNew = Get-Process redis-server -ErrorAction SilentlyContinue
    if ($redisNew) {
        Write-Host "  ✅ Redis Watchdog WORKING! Redis restarted (PID: $($redisNew.Id))" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Redis Watchdog FAILED - Redis not restarted" -ForegroundColor Red
    }
} else {
    Write-Host "  ⚠️ Redis not running, cannot test" -ForegroundColor Yellow
}

# ============================================================================
# STEP 3: Test Price Feeder Watchdog
# ============================================================================
Write-Host ""
Write-Host "STEP 3: Testing Price Feeder Watchdog..." -ForegroundColor Yellow

$mt5Current = Get-Process terminal64 -ErrorAction SilentlyContinue | Where-Object { $_.Path -match "MT5_PriceFeeder" }
if ($mt5Current) {
    Write-Host "  Stopping MT5 to test watchdog..." -ForegroundColor Gray
    Stop-Process -Id $mt5Current.Id -Force
    Start-Sleep -Seconds 2
    
    Write-Host "  Waiting 25 seconds for watchdog to restart MT5..." -ForegroundColor Gray
    Start-Sleep -Seconds 25
    
    $mt5New = Get-Process terminal64 -ErrorAction SilentlyContinue | Where-Object { $_.Path -match "MT5_PriceFeeder" }
    if ($mt5New) {
        Write-Host "  ✅ Price Feeder Watchdog WORKING! MT5 restarted (PID: $($mt5New.Id))" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Price Feeder Watchdog FAILED - MT5 not restarted" -ForegroundColor Red
    }
} else {
    Write-Host "  ⚠️ MT5 not running, cannot test" -ForegroundColor Yellow
}

# ============================================================================
# STEP 4: Final Status
# ============================================================================
Write-Host ""
Write-Host "STEP 4: Final Status..." -ForegroundColor Yellow

Write-Host ""
Write-Host "  Redis: " -NoNewline
$redisFinal = Get-Process redis-server -ErrorAction SilentlyContinue
if ($redisFinal) {
    Write-Host "✅ Running (PID: $($redisFinal.Id))" -ForegroundColor Green
} else {
    Write-Host "❌ NOT RUNNING" -ForegroundColor Red
}

Write-Host "  MT5 Price Feeder: " -NoNewline
$mt5Final = Get-Process terminal64 -ErrorAction SilentlyContinue | Where-Object { $_.Path -match "MT5_PriceFeeder" }
if ($mt5Final) {
    Write-Host "✅ Running (PID: $($mt5Final.Id))" -ForegroundColor Green
} else {
    Write-Host "❌ NOT RUNNING" -ForegroundColor Red
}

Write-Host ""
Write-Host "  Watchdogs:" -ForegroundColor Yellow
pm2 status | findstr watchdog

Write-Host ""
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "  VERIFICATION COMPLETE" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""
