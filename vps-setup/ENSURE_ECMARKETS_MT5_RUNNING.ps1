# ============================================================================
# ENSURE EC MARKETS MT5 IS RUNNING FOR PRICE FEEDER
# ============================================================================
# This script ensures the EC Markets MT5 terminal is running
# The Price Feeder requires MT5 to be running BEFORE it can connect
# ============================================================================

Write-Host ""
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "  ENSURE EC MARKETS MT5 IS RUNNING" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""

$EC_MARKETS_MT5 = "C:\Program Files\EC Markets MetaTrader 5\terminal64.exe"

# ============================================================================
# STEP 1: Verify EC Markets MT5 exists
# ============================================================================
Write-Host "STEP 1: Verifying EC Markets MT5 installation..." -ForegroundColor Yellow

if (-not (Test-Path $EC_MARKETS_MT5)) {
    Write-Host "  [ERROR] EC Markets MT5 NOT FOUND at: $EC_MARKETS_MT5" -ForegroundColor Red
    Write-Host "  Please install EC Markets MT5 from their website!" -ForegroundColor Yellow
    exit 1
}

Write-Host "  [OK] EC Markets MT5 found" -ForegroundColor Green
Write-Host ""

# ============================================================================
# STEP 2: Check if EC Markets MT5 is already running
# ============================================================================
Write-Host "STEP 2: Checking if EC Markets MT5 is running..." -ForegroundColor Yellow

$ecMarketsProcess = Get-Process terminal64 -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*EC Markets*" }

if ($ecMarketsProcess) {
    Write-Host "  [OK] EC Markets MT5 is already running" -ForegroundColor Green
    Write-Host "       PID: $($ecMarketsProcess.Id)" -ForegroundColor Gray
    Write-Host "       Path: $($ecMarketsProcess.Path)" -ForegroundColor Gray
    Write-Host ""
    exit 0
}

Write-Host "  [INFO] EC Markets MT5 is NOT running" -ForegroundColor Yellow
Write-Host ""

# ============================================================================
# STEP 3: Start EC Markets MT5
# ============================================================================
Write-Host "STEP 3: Starting EC Markets MT5..." -ForegroundColor Yellow

try {
    # Start MT5 in a new window
    $process = Start-Process -FilePath $EC_MARKETS_MT5 -WindowStyle Normal -PassThru
    
    Write-Host "  [OK] EC Markets MT5 launch command executed" -ForegroundColor Green
    Write-Host "       PID: $($process.Id)" -ForegroundColor Gray
    Write-Host ""
    
    # Wait for MT5 to fully start
    Write-Host "  Waiting for MT5 to initialize (15 seconds)..." -ForegroundColor Gray
    Start-Sleep -Seconds 15
    
    # Verify it's running
    $verifyProcess = Get-Process terminal64 -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*EC Markets*" }
    
    if ($verifyProcess) {
        Write-Host "  [OK] EC Markets MT5 is now running!" -ForegroundColor Green
        Write-Host "       PID: $($verifyProcess.Id)" -ForegroundColor Gray
        Write-Host ""
    } else {
        Write-Host "  [WARN] EC Markets MT5 process not detected yet" -ForegroundColor Yellow
        Write-Host "         It may still be starting up..." -ForegroundColor Gray
        Write-Host ""
    }
    
} catch {
    Write-Host "  [ERROR] Failed to start EC Markets MT5" -ForegroundColor Red
    Write-Host "         Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    exit 1
}

# ============================================================================
# STEP 4: Final Status
# ============================================================================
Write-Host "STEP 4: Final Status Check..." -ForegroundColor Yellow
Write-Host ""

$allMT5Processes = Get-Process terminal64 -ErrorAction SilentlyContinue

Write-Host "  All MT5 Processes:" -ForegroundColor Cyan
foreach ($proc in $allMT5Processes) {
    $isECMarkets = $proc.Path -like "*EC Markets*"
    $isBrokerService = $proc.Path -like "*MT5_BrokerService*"
    
    if ($isECMarkets) {
        Write-Host "    [PRICE FEEDER] PID: $($proc.Id) - EC Markets MT5" -ForegroundColor Green
    } elseif ($isBrokerService) {
        Write-Host "    [BROKER SERVICE] PID: $($proc.Id) - Broker Service MT5" -ForegroundColor Yellow
    } else {
        Write-Host "    [OTHER] PID: $($proc.Id) - $($proc.Path)" -ForegroundColor Gray
    }
}

Write-Host ""

# ============================================================================
# IMPORTANT NOTES
# ============================================================================
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "  IMPORTANT: MANUAL STEPS REQUIRED" -ForegroundColor Yellow
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  1. Log in to EC Markets MT5 with account: 81071266" -ForegroundColor White
Write-Host "  2. Enable Algo Trading: Tools -> Options -> Expert Advisors -> Allow Algo Trading" -ForegroundColor White
Write-Host "  3. Keep the MT5 window open (DO NOT close it)" -ForegroundColor White
Write-Host "  4. Restart Price Feeder: pm2 restart 'Imperial Price Feeder'" -ForegroundColor White
Write-Host ""
Write-Host "  The Price Feeder connects to an ALREADY RUNNING MT5 instance." -ForegroundColor Gray
Write-Host "  MT5 must be running and logged in BEFORE the Price Feeder starts." -ForegroundColor Gray
Write-Host ""
