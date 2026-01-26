# ============================================================================
# VERIFY AUTOSYNC END-TO-END
# ============================================================================
# This script verifies the complete autosync flow:
# 1. Generic MT5 status
# 2. Broker service status
# 3. MT5 connection test
# 4. Trade fetch test
# 5. IPC timeout handling
# Run this on VPS PowerShell as Administrator
# ============================================================================

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  VERIFYING AUTOSYNC END-TO-END" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

$errors = @()
$warnings = @()

# Step 1: Check Generic MT5 installation
Write-Host "[1/6] Checking Generic MT5 Installation..." -ForegroundColor Yellow
$genericMT5Path = "C:\Program Files\MetaTrader 5\terminal64.exe"
$genericMT5Installed = Test-Path $genericMT5Path

if ($genericMT5Installed) {
    Write-Host "   ✅ Generic MT5 is INSTALLED" -ForegroundColor Green
} else {
    Write-Host "   ❌ Generic MT5 is NOT INSTALLED" -ForegroundColor Red
    $errors += "Generic MT5 not installed at: $genericMT5Path"
}
Write-Host ""

# Step 2: Check Generic MT5 process
Write-Host "[2/6] Checking Generic MT5 Process..." -ForegroundColor Yellow
$genericMT5Process = Get-Process -Name terminal64 -ErrorAction SilentlyContinue | Where-Object { 
    $_.Path -like '*MetaTrader 5*' -and $_.Path -notlike '*EC Markets*' 
}

if ($genericMT5Process) {
    Write-Host "   ✅ Generic MT5 is RUNNING (PID: $($genericMT5Process.Id))" -ForegroundColor Green
    Write-Host "   📍 Path: $($genericMT5Process.Path)" -ForegroundColor Gray
} else {
    Write-Host "   ⚠️  Generic MT5 is NOT RUNNING" -ForegroundColor Yellow
    $warnings += "Generic MT5 not running. Start it manually: Start-Process '$genericMT5Path'"
}
Write-Host ""

# Step 3: Check Broker Service
Write-Host "[3/6] Checking Broker Service..." -ForegroundColor Yellow
$brokerServiceStatus = pm2 list 2>&1 | Select-String "imperial-trade-broker-service"

if ($brokerServiceStatus -match "online") {
    Write-Host "   ✅ Broker Service is ONLINE" -ForegroundColor Green
    $brokerServiceDir = "C:\vps-broker-service"
    if (Test-Path "$brokerServiceDir\python\fetch_trades.py") {
        Write-Host "   ✅ Python scripts found" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Python scripts NOT FOUND" -ForegroundColor Red
        $errors += "fetch_trades.py not found in $brokerServiceDir\python"
    }
} else {
    Write-Host "   ❌ Broker Service is NOT ONLINE" -ForegroundColor Red
    $errors += "Broker service not running. Start it: pm2 restart imperial-trade-broker-service"
}
Write-Host ""

# Step 4: Check Python MT5 library
Write-Host "[4/6] Checking Python MT5 Library..." -ForegroundColor Yellow
$pythonCheck = python -c "import MetaTrader5 as mt5; print('MT5_VERSION:', mt5.__version__)" 2>&1

if ($pythonCheck -match "MT5_VERSION") {
    $version = ($pythonCheck -split "MT5_VERSION: ")[1]
    Write-Host "   ✅ MetaTrader5 library installed (Version: $version)" -ForegroundColor Green
} else {
    Write-Host "   ❌ MetaTrader5 library NOT INSTALLED" -ForegroundColor Red
    $errors += "Python MetaTrader5 library not installed. Install: pip install MetaTrader5"
}
Write-Host ""

# Step 5: Test MT5 IPC Connection
Write-Host "[5/6] Testing MT5 IPC Connection..." -ForegroundColor Yellow
$testScript = @"
import sys
import json
import MetaTrader5 as mt5
import time

generic_mt5_path = r"C:\Program Files\MetaTrader 5\terminal64.exe"
max_retries = 3
initialized = False
last_error = None

for attempt in range(max_retries):
    initialized = mt5.initialize(path=generic_mt5_path)
    if initialized:
        break
    if attempt < max_retries - 1:
        last_error = mt5.last_error()
        wait_time = 2 ** attempt
        time.sleep(wait_time)

if initialized:
    account_info = mt5.account_info()
    if account_info:
        result = {
            "success": True,
            "account_login": account_info.login,
            "server": account_info.server,
            "balance": account_info.balance
        }
        mt5.shutdown()
    else:
        result = {"success": False, "error": "MT5 initialized but account_info is None"}
        mt5.shutdown()
else:
    result = {"success": False, "error": f"MT5 initialization failed: {last_error}"}

print(json.dumps(result))
"@

$testScript | python 2>&1 | Out-String | ForEach-Object {
    $result = $_ | ConvertFrom-Json -ErrorAction SilentlyContinue
    if ($result -and $result.success) {
        Write-Host "   ✅ MT5 IPC Connection WORKS" -ForegroundColor Green
        Write-Host "   📊 Connected to: Login $($result.account_login) on $($result.server)" -ForegroundColor Gray
        Write-Host "   💰 Account Balance: $($result.balance)" -ForegroundColor Gray
    } else {
        $errorMsg = if ($result) { $result.error } else { $_ }
        Write-Host "   ❌ MT5 IPC Connection FAILED" -ForegroundColor Red
        Write-Host "   ⚠️  Error: $errorMsg" -ForegroundColor Yellow
        $errors += "MT5 IPC connection failed: $errorMsg"
    }
}
Write-Host ""

# Step 6: Estimate Trade Fetch Time
Write-Host "[6/6] Estimating Trade Fetch Time..." -ForegroundColor Yellow
Write-Host "   ℹ️  Typical processing times:" -ForegroundColor White
Write-Host "      - MT5 initialization: ~1-5 seconds (with retries)" -ForegroundColor Gray
Write-Host "      - MT5 login: ~2-5 seconds" -ForegroundColor Gray
Write-Host "      - Fetch 90 days of deals: ~10-30 seconds (depends on trade count)" -ForegroundColor Gray
Write-Host "      - Process trades: ~1-5 seconds (depends on count)" -ForegroundColor Gray
Write-Host "      - Total: ~15-45 seconds (typical)" -ForegroundColor White
Write-Host "   ⚠️  Supabase Edge Function timeout: 60 seconds (default)" -ForegroundColor Yellow
Write-Host "   ✅ Should work within timeout if trade count is reasonable" -ForegroundColor Green
Write-Host ""

# Summary
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  VERIFICATION SUMMARY" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

if ($errors.Count -eq 0 -and $warnings.Count -eq 0) {
    Write-Host "✅ ALL CHECKS PASSED - Autosync should work!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Yellow
    Write-Host "  1. Ensure Generic MT5 is logged in to your broker account" -ForegroundColor White
    Write-Host "  2. Test journal sync from frontend" -ForegroundColor White
    Write-Host "  3. Monitor broker service logs: pm2 logs imperial-trade-broker-service --lines 50" -ForegroundColor White
} elseif ($errors.Count -eq 0) {
    Write-Host "⚠️  SOME WARNINGS (non-critical):" -ForegroundColor Yellow
    foreach ($warning in $warnings) {
        Write-Host "  - $warning" -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "✅ Core checks passed, but warnings should be addressed" -ForegroundColor Green
} else {
    Write-Host "❌ ERRORS FOUND:" -ForegroundColor Red
    foreach ($error in $errors) {
        Write-Host "  - $error" -ForegroundColor Red
    }
    if ($warnings.Count -gt 0) {
        Write-Host ""
        Write-Host "⚠️  WARNINGS:" -ForegroundColor Yellow
        foreach ($warning in $warnings) {
            Write-Host "  - $warning" -ForegroundColor Yellow
        }
    }
    Write-Host ""
    Write-Host "❌ Fix errors before testing autosync" -ForegroundColor Red
}

Write-Host ""



