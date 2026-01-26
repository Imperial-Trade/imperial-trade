# ============================================================================
# VERIFY ALL CONNECTIONS AND FILES
# ============================================================================
# Comprehensive verification of all connections, codes, and files
# ============================================================================

$ErrorActionPreference = "SilentlyContinue"

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  VERIFYING ALL CONNECTIONS AND FILES" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

$errors = @()
$warnings = @()

# 1. Generic MT5 Installation
Write-Host "[1/10] Generic MT5 Installation..." -ForegroundColor Yellow
$genericMT5Path = "C:\Program Files\MetaTrader 5\terminal64.exe"
if (Test-Path $genericMT5Path) {
    Write-Host "   ✅ Generic MT5 is INSTALLED" -ForegroundColor Green
} else {
    Write-Host "   ❌ Generic MT5 is NOT INSTALLED" -ForegroundColor Red
    $errors += "Generic MT5 not installed at: $genericMT5Path"
}
Write-Host ""

# 2. Generic MT5 Running
Write-Host "[2/10] Generic MT5 Running..." -ForegroundColor Yellow
$mt5Proc = Get-Process -Name terminal64 -ErrorAction SilentlyContinue | Where-Object { 
    $_.Path -like '*MetaTrader 5*' -and $_.Path -notlike '*EC Markets*' 
} | Select-Object -First 1
if ($mt5Proc) {
    Write-Host "   ✅ Generic MT5 is RUNNING (PID: $($mt5Proc.Id))" -ForegroundColor Green
    Write-Host "   📍 Path: $($mt5Proc.Path)" -ForegroundColor Gray
} else {
    Write-Host "   ⚠️  Generic MT5 is NOT RUNNING" -ForegroundColor Yellow
    $warnings += "Generic MT5 not running. Start it: Start-Process '$genericMT5Path'"
}
Write-Host ""

# 3. Broker Service Directory
Write-Host "[3/10] Broker Service Directory..." -ForegroundColor Yellow
$brokerDir = "C:\vps-broker-service"
if (Test-Path $brokerDir) {
    Write-Host "   ✅ Broker service directory EXISTS" -ForegroundColor Green
    Write-Host "   📍 Path: $brokerDir" -ForegroundColor Gray
} else {
    Write-Host "   ❌ Broker service directory NOT FOUND" -ForegroundColor Red
    $errors += "Broker service directory not found: $brokerDir"
}
Write-Host ""

# 4. Python Directory
Write-Host "[4/10] Python Scripts Directory..." -ForegroundColor Yellow
$pythonDir = "$brokerDir\python"
if (Test-Path $pythonDir) {
    Write-Host "   ✅ Python directory EXISTS" -ForegroundColor Green
} else {
    Write-Host "   ❌ Python directory NOT FOUND" -ForegroundColor Red
    $errors += "Python directory not found: $pythonDir"
}
Write-Host ""

# 5. Python Scripts
Write-Host "[5/10] Python Scripts..." -ForegroundColor Yellow
$fetchTrades = "$pythonDir\fetch_trades.py"
$testConnection = "$pythonDir\test_connection.py"

if (Test-Path $fetchTrades) {
    Write-Host "   ✅ fetch_trades.py EXISTS" -ForegroundColor Green
} else {
    Write-Host "   ❌ fetch_trades.py NOT FOUND" -ForegroundColor Red
    $errors += "fetch_trades.py not found: $fetchTrades"
}

if (Test-Path $testConnection) {
    Write-Host "   ✅ test_connection.py EXISTS" -ForegroundColor Green
} else {
    Write-Host "   ❌ test_connection.py NOT FOUND" -ForegroundColor Red
    $errors += "test_connection.py not found: $testConnection"
}
Write-Host ""

# 6. TypeScript Source
Write-Host "[6/10] TypeScript Source..." -ForegroundColor Yellow
$srcDir = "$brokerDir\src"
$indexTs = "$srcDir\index.ts"
if (Test-Path $indexTs) {
    Write-Host "   ✅ index.ts EXISTS" -ForegroundColor Green
} else {
    Write-Host "   ❌ index.ts NOT FOUND" -ForegroundColor Red
    $errors += "index.ts not found: $indexTs"
}
Write-Host ""

# 7. Environment File
Write-Host "[7/10] Environment Configuration..." -ForegroundColor Yellow
$envFile = "$brokerDir\.env"
if (Test-Path $envFile) {
    Write-Host "   ✅ .env file EXISTS" -ForegroundColor Green
    
    # Check for VPS_API_KEY
    $envContent = Get-Content $envFile -Raw
    if ($envContent -match "VPS_API_KEY") {
        Write-Host "   ✅ VPS_API_KEY is configured" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  VPS_API_KEY not found in .env" -ForegroundColor Yellow
        $warnings += "VPS_API_KEY not configured in .env file"
    }
    
    if ($envContent -match "PORT") {
        $portMatch = [regex]::Match($envContent, "PORT\s*=\s*(\d+)")
        if ($portMatch.Success) {
            $port = $portMatch.Groups[1].Value
            Write-Host "   ✅ PORT is configured: $port" -ForegroundColor Green
        }
    } else {
        Write-Host "   ⚠️  PORT not found in .env (defaults to 3001)" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⚠️  .env file NOT FOUND" -ForegroundColor Yellow
    $warnings += ".env file not found. Service may use default values"
}
Write-Host ""

# 8. Broker Service Running
Write-Host "[8/10] Broker Service Running..." -ForegroundColor Yellow
try {
    $pm2Status = pm2 jlist 2>&1 | ConvertFrom-Json 2>$null | Where-Object { 
        $_.name -eq "imperial-trade-broker-service" 
    } | Select-Object -First 1
    
    if ($pm2Status) {
        if ($pm2Status.pm2_env.status -eq "online") {
            Write-Host "   ✅ Broker Service is ONLINE" -ForegroundColor Green
            Write-Host "   📍 Status: $($pm2Status.pm2_env.status)" -ForegroundColor Gray
            Write-Host "   📍 Port: $($pm2Status.pm2_env.PORT)" -ForegroundColor Gray
            Write-Host "   📍 PID: $($pm2Status.pid)" -ForegroundColor Gray
        } else {
            Write-Host "   ❌ Broker Service is NOT ONLINE (Status: $($pm2Status.pm2_env.status))" -ForegroundColor Red
            $errors += "Broker service not online. Status: $($pm2Status.pm2_env.status)"
        }
    } else {
        Write-Host "   ❌ Broker Service NOT FOUND in PM2" -ForegroundColor Red
        $errors += "Broker service not found in PM2. Start it: pm2 start $brokerDir\src\index.ts --name imperial-trade-broker-service"
    }
} catch {
    Write-Host "   ❌ Error checking PM2: $_" -ForegroundColor Red
    $warnings += "Could not check PM2 status: $_"
}
Write-Host ""

# 9. Network Port Listening
Write-Host "[9/10] Network Port Listening..." -ForegroundColor Yellow
if ($pm2Status -and $pm2Status.pm2_env.PORT) {
    $port = $pm2Status.pm2_env.PORT
    $listener = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($listener) {
        Write-Host "   ✅ Port $port is LISTENING" -ForegroundColor Green
        Write-Host "   📍 State: $($listener.State)" -ForegroundColor Gray
    } else {
        Write-Host "   ⚠️  Port $port is NOT LISTENING" -ForegroundColor Yellow
        $warnings += "Port $port not listening. Service may not be accepting connections"
    }
} else {
    Write-Host "   ⚠️  Cannot check port (service not found or port not configured)" -ForegroundColor Yellow
}
Write-Host ""

# 10. Python MT5 Library
Write-Host "[10/10] Python MT5 Library..." -ForegroundColor Yellow
try {
    $pythonCheck = python -c "import MetaTrader5 as mt5; print('MT5_VERSION:', mt5.__version__)" 2>&1 | Select-Object -First 1
    if ($pythonCheck -match "MT5_VERSION") {
        $version = ($pythonCheck -split "MT5_VERSION: ")[1]
        Write-Host "   ✅ MetaTrader5 library installed (Version: $version)" -ForegroundColor Green
    } else {
        Write-Host "   ❌ MetaTrader5 library NOT INSTALLED" -ForegroundColor Red
        $errors += "Python MetaTrader5 library not installed. Install: pip install MetaTrader5"
    }
} catch {
    Write-Host "   ⚠️  Could not check Python MT5 library: $_" -ForegroundColor Yellow
    $warnings += "Could not verify Python MT5 library: $_"
}
Write-Host ""

# Summary
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  VERIFICATION SUMMARY" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

if ($errors.Count -eq 0 -and $warnings.Count -eq 0) {
    Write-Host "✅ ALL CHECKS PASSED - All connections and files are correct!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Configuration Summary:" -ForegroundColor Yellow
    Write-Host "  - Generic MT5: Installed and Running ✅" -ForegroundColor White
    Write-Host "  - Broker Service: Directory and files present ✅" -ForegroundColor White
    Write-Host "  - Python Scripts: All files present ✅" -ForegroundColor White
    Write-Host "  - TypeScript Source: Present ✅" -ForegroundColor White
    Write-Host "  - Environment: Configured ✅" -ForegroundColor White
    Write-Host "  - Service Status: Online ✅" -ForegroundColor White
    Write-Host "  - Network Port: Listening ✅" -ForegroundColor White
    Write-Host "  - Python MT5 Library: Installed ✅" -ForegroundColor White
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



