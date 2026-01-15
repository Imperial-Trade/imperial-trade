# ============================================================================
# COMPLETE FIX: Price Feeder MT5 Connection Issue
# ============================================================================
# This script fixes the Price Feeder IPC connection issue now that MT5 is confirmed running

Write-Host ""
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "  FIXING PRICE FEEDER - MT5 CONNECTION ISSUE" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Verify MT5_PriceFeeder is running
Write-Host "Step 1: Verifying MT5_PriceFeeder is running..." -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Gray

$mt5Process = Get-Process terminal64 -ErrorAction SilentlyContinue | Where-Object {
    $_.Path -like "*MT5_PriceFeeder*"
}

if (-not $mt5Process) {
    Write-Host "  ❌ MT5_PriceFeeder NOT running!" -ForegroundColor Red
    Write-Host "  Starting MT5_PriceFeeder..." -ForegroundColor Yellow
    
    if (Test-Path "C:\MT5_PriceFeeder\terminal64.exe") {
        Start-Process -FilePath "C:\MT5_PriceFeeder\terminal64.exe" -ArgumentList "/portable" -WindowStyle Normal
        Write-Host "  ✅ MT5_PriceFeeder started" -ForegroundColor Green
        Write-Host "  ⏳ Waiting 20 seconds for MT5 to initialize and login..." -ForegroundColor Yellow
        Start-Sleep -Seconds 20
    } else {
        Write-Host "  ❌ MT5_PriceFeeder not found at C:\MT5_PriceFeeder\terminal64.exe" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "  ✅ MT5_PriceFeeder is running (PID: $($mt5Process.Id))" -ForegroundColor Green
}

Write-Host ""

# Step 2: Verify files exist
Write-Host "Step 2: Verifying Price Feeder files..." -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Gray

$distFile = "C:\imperial-price-feeder\dist\index.js"
$pythonFile = "C:\imperial-price-feeder\python\mt5_price_reader.py"

if (-not (Test-Path $distFile)) {
    Write-Host "  ❌ Price Feeder main file NOT FOUND: $distFile" -ForegroundColor Red
    Write-Host "  [ACTION] Need to build Price Feeder first:" -ForegroundColor Yellow
    Write-Host "    cd C:\imperial-price-feeder" -ForegroundColor White
    Write-Host "    npm run build" -ForegroundColor White
    exit 1
} else {
    Write-Host "  ✅ Price Feeder main file exists: $distFile" -ForegroundColor Green
}

if (-not (Test-Path $pythonFile)) {
    Write-Host "  ❌ Python script NOT FOUND: $pythonFile" -ForegroundColor Red
    exit 1
} else {
    Write-Host "  ✅ Python script exists: $pythonFile" -ForegroundColor Green
    
    # Verify Python script uses correct MT5 path
    $content = Get-Content $pythonFile -Raw
    if ($content -match "C:\\MT5_PriceFeeder\\terminal64.exe" -and $content -match "portable=True") {
        Write-Host "  ✅ Python script correctly configured for MT5_PriceFeeder (portable)" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Python script may not be using correct MT5 path" -ForegroundColor Yellow
    }
}

Write-Host ""

# Step 3: Clean restart Price Feeder
Write-Host "Step 3: Performing clean restart of Price Feeder..." -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Gray

# Delete any existing Price Feeder process
Write-Host "  Stopping existing Price Feeder..." -ForegroundColor Gray
pm2 delete "Imperial Price Feeder" 2>$null
Start-Sleep -Seconds 3

# Wait a bit more to ensure MT5 is fully ready
Write-Host "  Waiting 5 seconds for MT5 to be fully ready..." -ForegroundColor Gray
Start-Sleep -Seconds 5

# Start Price Feeder fresh
Write-Host "  Starting Price Feeder..." -ForegroundColor Gray
if (Test-Path "C:\imperial-price-feeder\pm2-isolated.config.js") {
    pm2 start "C:\imperial-price-feeder\pm2-isolated.config.js"
} else {
    pm2 start $distFile --name "Imperial Price Feeder" --cwd "C:\imperial-price-feeder"
}

Start-Sleep -Seconds 5

Write-Host "  ✅ Price Feeder restarted" -ForegroundColor Green

Write-Host ""

# Step 4: Check status
Write-Host "Step 4: Checking Price Feeder status..." -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Gray

$status = pm2 status | Select-String "Imperial Price Feeder"
if ($status) {
    Write-Host "  Price Feeder Status:" -ForegroundColor Gray
    $status | ForEach-Object { Write-Host "    $_" -ForegroundColor White }
    
    if ($status -match "online") {
        Write-Host "  ✅ Price Feeder is ONLINE" -ForegroundColor Green
    } elseif ($status -match "errored" -or $status -match "stopped") {
        Write-Host "  ❌ Price Feeder is NOT running properly" -ForegroundColor Red
        Write-Host "  [ACTION] Check logs below for errors" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ❌ Price Feeder not found in PM2" -ForegroundColor Red
}

Write-Host ""

# Step 5: Wait and check logs
Write-Host "Step 5: Waiting 15 seconds for initialization, then checking logs..." -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Gray

Write-Host "  Waiting for Price Feeder to initialize..." -ForegroundColor Gray
Start-Sleep -Seconds 15

Write-Host ""
Write-Host "  Recent Price Feeder logs (last 30 lines):" -ForegroundColor Gray
$logs = pm2 logs "Imperial Price Feeder" --lines 30 --nostream 2>&1 | Select-Object -Last 30

# Filter for important messages
$errors = $logs | Select-String -Pattern "ERROR|error|Failed|failed|IPC send|MT5 initialization failed" -CaseSensitive:$false
$success = $logs | Select-String -Pattern "Connected|MT5 initialized|prices sent|XAUUSD|BTCUSD" -CaseSensitive:$false

if ($errors) {
    Write-Host "  ⚠️  ERRORS FOUND:" -ForegroundColor Red
    $errors | Select-Object -Last 10 | ForEach-Object { Write-Host "    $_" -ForegroundColor Red }
    Write-Host ""
}

if ($success) {
    Write-Host "  ✅ SUCCESS MESSAGES:" -ForegroundColor Green
    $success | Select-Object -Last 5 | ForEach-Object { Write-Host "    $_" -ForegroundColor Green
    }
    Write-Host ""
}

# Show all recent logs
Write-Host "  All recent log entries:" -ForegroundColor Gray
$logs | Select-Object -Last 15 | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }

Write-Host ""

# Step 6: Test Python connection directly
Write-Host "Step 6: Testing Python MT5 connection directly..." -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Gray

Write-Host "  Testing if Python can connect to MT5_PriceFeeder..." -ForegroundColor Gray
$pythonTest = python -c "import MetaTrader5 as mt5; import sys; print('Initializing MT5...'); result = mt5.initialize(path=r'C:\MT5_PriceFeeder\terminal64.exe', portable=True); print(f'Initialize result: {result}'); print(f'Error: {mt5.last_error()}'); info = mt5.terminal_info(); print(f'Terminal connected: {info.connected if info else False}'); print(f'Terminal build: {info.build if info else None}'); account = mt5.account_info(); print(f'Account: {account.login if account else None}'); mt5.shutdown() if result else sys.exit(1)" 2>&1

if ($pythonTest -match "Initialize result: True") {
    Write-Host "  ✅ Python can connect to MT5_PriceFeeder!" -ForegroundColor Green
    $pythonTest | Select-String -Pattern "Account:|Terminal connected:" | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }
} else {
    Write-Host "  ❌ Python cannot connect to MT5_PriceFeeder" -ForegroundColor Red
    $pythonTest | ForEach-Object { Write-Host "    $_" -ForegroundColor Red }
}

Write-Host ""

# Step 7: Fix watchdog if errored
Write-Host "Step 7: Checking and fixing watchdog..." -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Gray

$watchdogStatus = pm2 status | Select-String "price-feeder-watchdog"
if ($watchdogStatus -match "errored" -or $watchdogStatus -match "stopped") {
    Write-Host "  ⚠️  Watchdog is errored/stopped, restarting..." -ForegroundColor Yellow
    pm2 delete price-feeder-watchdog 2>$null
    Start-Sleep -Seconds 2
    
    $watchdogPath = "C:\imperial-price-feeder\watchdogs\price-feeder-watchdog-advanced.js"
    if (Test-Path $watchdogPath) {
        pm2 start $watchdogPath --name price-feeder-watchdog --cwd "C:\imperial-price-feeder"
        Start-Sleep -Seconds 2
        Write-Host "  ✅ Watchdog restarted" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Watchdog script not found at $watchdogPath" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ✅ Watchdog is online" -ForegroundColor Green
}

Write-Host ""

# Final summary
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "  FINAL STATUS SUMMARY" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""

pm2 status

Write-Host ""
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "  NEXT STEPS" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Monitor Price Feeder logs in real-time:" -ForegroundColor Yellow
Write-Host "  pm2 logs 'Imperial Price Feeder' --lines 50" -ForegroundColor White
Write-Host ""

Write-Host "If you still see 'IPC send failed' errors:" -ForegroundColor Yellow
Write-Host "  1. Verify MT5_PriceFeeder terminal is OPEN, LOGGED IN, and CONNECTED" -ForegroundColor White
Write-Host "  2. Check MT5 terminal shows 'Connected' status (not 'Disconnected')" -ForegroundColor White
Write-Host "  3. Verify account: 81071266, server: ECMarkets-MT5-Live01" -ForegroundColor White
Write-Host "  4. Make sure 'Algo Trading' button is GREEN (enabled) in MT5" -ForegroundColor White
Write-Host "  5. Wait 30 seconds after MT5 login before restarting Price Feeder" -ForegroundColor White
Write-Host ""

Write-Host "If Price Feeder shows 'errored' status:" -ForegroundColor Yellow
Write-Host "  pm2 logs 'Imperial Price Feeder' --err --lines 50" -ForegroundColor White
Write-Host ""

Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""
