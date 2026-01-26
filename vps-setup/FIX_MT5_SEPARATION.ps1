# ============================================================================
# FIX MT5 SEPARATION - Ensure Price Feeder and Broker Service are ISOLATED
# ============================================================================

Write-Host ""
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "  FIX MT5 SEPARATION" -ForegroundColor Cyan
Write-Host "  Price Feeder = EC Markets MT5" -ForegroundColor Cyan
Write-Host "  Broker Service = C:\MT5_BrokerService (Portable)" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$EC_MARKETS_MT5 = "C:\Program Files\EC Markets MetaTrader 5\terminal64.exe"
$BROKER_SERVICE_MT5 = "C:\MT5_BrokerService\terminal64.exe"

# STEP 1: Check current MT5 processes
Write-Host "STEP 1: Checking current MT5 processes..." -ForegroundColor Yellow

$mt5Procs = Get-Process -Name terminal64 -ErrorAction SilentlyContinue
if ($mt5Procs) {
    Write-Host "  Found $($mt5Procs.Count) MT5 process(es):" -ForegroundColor Gray
    foreach ($proc in $mt5Procs) {
        Write-Host "    PID $($proc.Id): $($proc.Path)" -ForegroundColor Gray
    }
} else {
    Write-Host "  No MT5 processes running" -ForegroundColor Gray
}
Write-Host ""

# STEP 2: Identify which processes to keep/close
Write-Host "STEP 2: Analyzing processes..." -ForegroundColor Yellow

$ecMarketsProc = $null
$brokerServiceProc = $null
$wrongProcs = @()

foreach ($proc in $mt5Procs) {
    $path = $proc.Path
    
    if ($path -like "*EC Markets*") {
        $ecMarketsProc = $proc
        Write-Host "  [KEEP] EC Markets MT5 (PID: $($proc.Id))" -ForegroundColor Green
    } elseif ($path -like "*MT5_BrokerService*") {
        if ($brokerServiceProc -eq $null) {
            $brokerServiceProc = $proc
            Write-Host "  [KEEP] Broker Service MT5 (PID: $($proc.Id))" -ForegroundColor Green
        } else {
            $wrongProcs += $proc
            Write-Host "  [CLOSE] Extra Broker Service MT5 (PID: $($proc.Id))" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  [INFO] Other MT5 (PID: $($proc.Id)): $path" -ForegroundColor Gray
    }
}
Write-Host ""

# STEP 3: Close extra processes
if ($wrongProcs.Count -gt 0) {
    Write-Host "STEP 3: Closing extra MT5 processes..." -ForegroundColor Yellow
    foreach ($proc in $wrongProcs) {
        Write-Host "  Stopping PID $($proc.Id)..." -ForegroundColor Gray
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 2
    Write-Host "  [OK] Extra processes stopped" -ForegroundColor Green
} else {
    Write-Host "STEP 3: No extra processes to close" -ForegroundColor Green
}
Write-Host ""

# STEP 4: Start EC Markets MT5 if not running (for Price Feeder)
Write-Host "STEP 4: Ensuring EC Markets MT5 is running (Price Feeder)..." -ForegroundColor Yellow

if (-not $ecMarketsProc) {
    if (Test-Path $EC_MARKETS_MT5) {
        Write-Host "  Starting EC Markets MT5..." -ForegroundColor Gray
        Start-Process -FilePath $EC_MARKETS_MT5
        Start-Sleep -Seconds 5
        Write-Host "  [OK] EC Markets MT5 started" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] EC Markets MT5 not found at: $EC_MARKETS_MT5" -ForegroundColor Red
    }
} else {
    Write-Host "  [OK] EC Markets MT5 already running (PID: $($ecMarketsProc.Id))" -ForegroundColor Green
}
Write-Host ""

# STEP 5: Start Broker Service MT5 if not running (Portable)
Write-Host "STEP 5: Ensuring Broker Service MT5 is running (Portable)..." -ForegroundColor Yellow

$brokerServiceProc = Get-Process -Name terminal64 -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*MT5_BrokerService*" } | Select-Object -First 1

if (-not $brokerServiceProc) {
    if (Test-Path $BROKER_SERVICE_MT5) {
        Write-Host "  Starting Broker Service MT5 in portable mode..." -ForegroundColor Gray
        Start-Process -FilePath $BROKER_SERVICE_MT5 -ArgumentList "/portable" -WorkingDirectory "C:\MT5_BrokerService"
        Start-Sleep -Seconds 5
        Write-Host "  [OK] Broker Service MT5 started" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] Broker Service MT5 not found at: $BROKER_SERVICE_MT5" -ForegroundColor Red
    }
} else {
    Write-Host "  [OK] Broker Service MT5 already running (PID: $($brokerServiceProc.Id))" -ForegroundColor Green
}
Write-Host ""

# STEP 6: Restart PM2 services
Write-Host "STEP 6: Restarting PM2 services..." -ForegroundColor Yellow
pm2 restart all
Start-Sleep -Seconds 3
Write-Host "  [OK] PM2 services restarted" -ForegroundColor Green
Write-Host ""

# STEP 7: Final Verification
Write-Host "STEP 7: Final Verification..." -ForegroundColor Yellow

$finalProcs = Get-Process -Name terminal64 -ErrorAction SilentlyContinue
Write-Host ""
Write-Host "  Current MT5 Processes:" -ForegroundColor Cyan

$hasECMarkets = $false
$hasBrokerService = $false

foreach ($proc in $finalProcs) {
    $path = $proc.Path
    $type = "UNKNOWN"
    
    if ($path -like "*EC Markets*") {
        $type = "EC MARKETS (Price Feeder)"
        $hasECMarkets = $true
    } elseif ($path -like "*MT5_BrokerService*") {
        $type = "BROKER SERVICE (Portable)"
        $hasBrokerService = $true
    }
    
    Write-Host "    PID $($proc.Id): $type" -ForegroundColor Gray
    Write-Host "    Path: $path" -ForegroundColor DarkGray
}

Write-Host ""
pm2 status
Write-Host ""

# FINAL SUMMARY
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "  SEPARATION STATUS" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""

if ($hasECMarkets) {
    Write-Host "  [OK] EC Markets MT5: Running (Price Feeder)" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] EC Markets MT5: NOT Running!" -ForegroundColor Red
    Write-Host "     Please start manually: $EC_MARKETS_MT5" -ForegroundColor Yellow
}

if ($hasBrokerService) {
    Write-Host "  [OK] Broker Service MT5: Running (Portable)" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] Broker Service MT5: NOT Running!" -ForegroundColor Red
    Write-Host "     Please start: $BROKER_SERVICE_MT5 /portable" -ForegroundColor Yellow
}

Write-Host ""

if ($hasECMarkets -and $hasBrokerService) {
    Write-Host "  PERFECT ISOLATION ACHIEVED!" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Architecture:" -ForegroundColor Cyan
    Write-Host "  PRICE FEEDER: EC Markets MT5 (Program Files)" -ForegroundColor Gray
    Write-Host "  BROKER SERVICE: C:\MT5_BrokerService (Portable)" -ForegroundColor Gray
} else {
    Write-Host "  MANUAL INTERVENTION REQUIRED" -ForegroundColor Yellow
}

Write-Host ""
