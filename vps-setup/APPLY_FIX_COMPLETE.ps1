# ============================================================================
# COMPLETE FIX: Price Feeder MT5 Connection Issue
# ============================================================================
# This script deploys the fixed Python script and restarts the Price Feeder

Write-Host ""
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "  APPLYING COMPLETE PRICE FEEDER FIX" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Create/Update Python script with IPC fix
Write-Host "Step 1: Creating/Updating Python script with IPC fix..." -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Gray

$pythonScriptContent = @'
#!/usr/bin/env python3
"""
MT5 Price Reader - Reads live prices from EC Markets MT5 terminal
Outputs JSON to stdout for Price Feeder to consume
"""

import sys
import json
import os
import time
from datetime import datetime

try:
    import MetaTrader5 as mt5
except ImportError:
    print(json.dumps({"error": "MetaTrader5 module not installed. Run: pip install MetaTrader5"}))
    sys.exit(1)

def normalize_symbol(symbol):
    """Normalize symbol names"""
    symbol_map = {
        'GOLD': 'XAUUSD',
        'GOLD/USD': 'XAUUSD',
        'XAU/USD': 'XAUUSD',
        'BTC/USD': 'BTCUSD',
        'US30': 'U30USD',
        'SPX500': 'SPXUSD',
        'NAS100': 'NDXUSD'
    }
    return symbol_map.get(symbol.upper(), symbol.upper())

def get_price_from_mt5(symbol):
    """Get current price from MT5 for a symbol"""
    try:
        # Try direct symbol
        tick = mt5.symbol_info_tick(symbol)
        
        if tick is None:
            # Try normalized symbol
            normalized = normalize_symbol(symbol)
            if normalized != symbol:
                tick = mt5.symbol_info_tick(normalized)
        
        if tick is None:
            # Try common variations
            variations = [
                symbol.replace('/', ''),
                symbol.replace('USD', ''),
                f"{symbol.replace('/', '')}USD"
            ]
            for variation in variations:
                tick = mt5.symbol_info_tick(variation)
                if tick:
                    break
        
        if tick is None or tick.bid == 0:
            return None
        
        # Calculate mid price
        mid = (tick.bid + tick.ask) / 2
        
        return {
            'symbol': normalize_symbol(symbol),
            'bid': float(tick.bid),
            'ask': float(tick.ask),
            'mid': float(mid),
            'price': float(mid),  # Default to mid for compatibility
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        }
    except Exception as e:
        print(f"Error getting price for {symbol}: {e}", file=sys.stderr)
        return None

def main():
    # Get symbols from command line arguments
    if len(sys.argv) < 2:
        # Default symbols if none provided
        symbols = ['XAUUSD', 'BTCUSD', 'EURUSD', 'GBPUSD', 'USDJPY']
    else:
        symbols = sys.argv[1:]
    
    # Initialize MT5 connection - Using MT5_PriceFeeder (Portable Mode)
    # CRITICAL: Use explicit path to avoid conflicts with MT5_BrokerService
    if not mt5.initialize(path=r"C:\MT5_PriceFeeder\terminal64.exe", portable=True):
        error = mt5.last_error()
        print(json.dumps({
            "error": f"MT5 initialization failed: {error}",
            "code": error[0],
            "description": error[1],
            "mt5_path": "C:\\MT5_PriceFeeder\\terminal64.exe",
            "portable": True
        }), file=sys.stderr)
        sys.exit(1)
    
    # CRITICAL: Add delay after initialization to let IPC pipe fully open
    # This prevents "IPC send failed" errors on Windows VPS
    time.sleep(2)  # Wait 2 seconds for IPC connection to be ready
    
    # Verify IPC connection is actually working
    terminal_info = mt5.terminal_info()
    if not terminal_info or not terminal_info.connected:
        error = mt5.last_error()
        print(json.dumps({
            "error": f"MT5 initialized but IPC not ready: {error}",
            "code": error[0],
            "description": error[1],
            "mt5_path": "C:\\MT5_PriceFeeder\\terminal64.exe",
            "portable": True
        }), file=sys.stderr)
        mt5.shutdown()
        sys.exit(1)
    
    # Get account info to verify connection
    account_info = mt5.account_info()
    if account_info is None:
        print(json.dumps({
            "error": "Failed to get account info. Is MT5 terminal running and logged in?",
            "mt5_path": "C:\\MT5_PriceFeeder\\terminal64.exe",
            "portable": True
        }), file=sys.stderr)
        mt5.shutdown()
        sys.exit(1)
    
    # Collect prices for all symbols
    prices = []
    for symbol in symbols:
        price_data = get_price_from_mt5(symbol)
        if price_data:
            prices.append(price_data)
    
    # Shutdown MT5
    mt5.shutdown()
    
    # Output JSON to stdout
    print(json.dumps(prices, indent=2))

if __name__ == '__main__':
    main()
'@

# Ensure directory exists
$pythonDir = "C:\imperial-price-feeder\python"
if (-not (Test-Path $pythonDir)) {
    New-Item -ItemType Directory -Path $pythonDir -Force | Out-Null
    Write-Host "  ✅ Created directory: $pythonDir" -ForegroundColor Green
}

# Write the fixed Python script
$pythonPath = Join-Path $pythonDir "mt5_price_reader.py"
Set-Content -Path $pythonPath -Value $pythonScriptContent -Force
Write-Host "  ✅ Updated Python script: $pythonPath" -ForegroundColor Green

# Verify the fix is present
$content = Get-Content $pythonPath -Raw
if ($content -match "time.sleep\(2\)" -and $content -match "terminal_info = mt5.terminal_info\(\)") {
    Write-Host "  ✅ IPC fix verified in Python script" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  IPC fix may not be present in Python script" -ForegroundColor Yellow
}

Write-Host ""

# Step 2: Verify MT5_PriceFeeder is running
Write-Host "Step 2: Verifying MT5_PriceFeeder is running..." -ForegroundColor Yellow
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

# Step 3: Verify files exist
Write-Host "Step 3: Verifying Price Feeder files..." -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Gray

$distFile = "C:\imperial-price-feeder\dist\index.js"

if (-not (Test-Path $distFile)) {
    Write-Host "  ❌ Price Feeder main file NOT FOUND: $distFile" -ForegroundColor Red
    Write-Host "  [ACTION] Need to build Price Feeder first:" -ForegroundColor Yellow
    Write-Host "    cd C:\imperial-price-feeder" -ForegroundColor White
    Write-Host "    npm run build" -ForegroundColor White
    exit 1
} else {
    Write-Host "  ✅ Price Feeder main file exists: $distFile" -ForegroundColor Green
}

Write-Host ""

# Step 4: Clean restart Price Feeder
Write-Host "Step 4: Performing clean restart of Price Feeder..." -ForegroundColor Yellow
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

# Step 5: Check status
Write-Host "Step 5: Checking Price Feeder status..." -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Gray

$status = pm2 status | Select-String "Imperial Price Feeder"
if ($status) {
    Write-Host "  Price Feeder Status:" -ForegroundColor Gray
    $status | ForEach-Object { Write-Host "    $_" -ForegroundColor White }
    
    if ($status -match "online") {
        Write-Host "  ✅ Price Feeder is ONLINE" -ForegroundColor Green
    } elseif ($status -match "errored" -or $status -match "stopped") {
        Write-Host "  ❌ Price Feeder is NOT running properly" -ForegroundColor Red
    }
} else {
    Write-Host "  ❌ Price Feeder not found in PM2" -ForegroundColor Red
}

Write-Host ""

# Step 6: Wait and check logs
Write-Host "Step 6: Waiting 15 seconds for initialization, then checking logs..." -ForegroundColor Yellow
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
    $success | Select-Object -Last 5 | ForEach-Object { Write-Host "    $_" -ForegroundColor Green }
    Write-Host ""
}

# Show all recent logs
Write-Host "  All recent log entries:" -ForegroundColor Gray
$logs | Select-Object -Last 15 | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }

Write-Host ""

# Step 7: Test Python connection directly
Write-Host "Step 7: Testing Python MT5 connection directly..." -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Gray

Write-Host "  Testing if Python can connect to MT5_PriceFeeder..." -ForegroundColor Gray
$pythonTest = python -c "import MetaTrader5 as mt5; import sys; print('Initializing MT5...'); result = mt5.initialize(path=r'C:\MT5_PriceFeeder\terminal64.exe', portable=True); print(f'Initialize result: {result}'); print(f'Error: {mt5.last_error()}'); import time; time.sleep(2); info = mt5.terminal_info(); print(f'Terminal connected: {info.connected if info else False}'); account = mt5.account_info(); print(f'Account: {account.login if account else None}'); mt5.shutdown() if result else sys.exit(1)" 2>&1

if ($pythonTest -match "Initialize result: True" -and $pythonTest -match "Terminal connected: True") {
    Write-Host "  ✅ Python can connect to MT5_PriceFeeder!" -ForegroundColor Green
    $pythonTest | Select-String -Pattern "Account:|Terminal connected:" | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }
} else {
    Write-Host "  ⚠️  Python connection test results:" -ForegroundColor Yellow
    $pythonTest | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }
}

Write-Host ""

# Step 8: Fix watchdog if errored
Write-Host "Step 8: Checking and fixing watchdog..." -ForegroundColor Yellow
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

Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""
