# ============================================================================
# QUICK VERIFY AUTOSYNC - FAST VERSION
# ============================================================================
# Optimized for speed - removes slow operations, adds timeouts
# Run this on VPS PowerShell as Administrator
# ============================================================================

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  QUICK AUTOSYNC VERIFICATION" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

$errors = @()
$warnings = @()

# Step 1: Check Generic MT5 installation (FAST - file check only)
Write-Host "[1/4] Checking Generic MT5 Installation..." -ForegroundColor Yellow
$genericMT5Path = "C:\Program Files\MetaTrader 5\terminal64.exe"
$genericMT5Installed = Test-Path $genericMT5Path -ErrorAction SilentlyContinue

if ($genericMT5Installed) {
    Write-Host "   ✅ Generic MT5 is INSTALLED" -ForegroundColor Green
} else {
    Write-Host "   ❌ Generic MT5 is NOT INSTALLED" -ForegroundColor Red
    $errors += "Generic MT5 not installed at: $genericMT5Path"
}
Write-Host ""

# Step 2: Check Generic MT5 process (FAST - with timeout)
Write-Host "[2/4] Checking Generic MT5 Process..." -ForegroundColor Yellow
try {
    # Use timeout to prevent hanging
    $processCheck = Start-Job -ScriptBlock {
        Get-Process -Name terminal64 -ErrorAction SilentlyContinue | Where-Object { 
            $_.Path -like '*MetaTrader 5*' -and $_.Path -notlike '*EC Markets*' 
        }
    }
    
    $processResult = $processCheck | Wait-Job -Timeout 3
    if ($processResult) {
        $genericMT5Process = $processCheck | Receive-Job
        Stop-Job $processCheck | Remove-Job -Force
        
        if ($genericMT5Process) {
            Write-Host "   ✅ Generic MT5 is RUNNING (PID: $($genericMT5Process.Id))" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  Generic MT5 is NOT RUNNING" -ForegroundColor Yellow
            $warnings += "Generic MT5 not running. Start it manually: Start-Process '$genericMT5Path'"
        }
    } else {
        Stop-Job $processCheck | Remove-Job -Force
        Write-Host "   ⚠️  Process check timed out" -ForegroundColor Yellow
        $warnings += "Could not verify if Generic MT5 is running (timeout)"
    }
} catch {
    Write-Host "   ⚠️  Error checking process: $_" -ForegroundColor Yellow
    $warnings += "Could not verify if Generic MT5 is running: $_"
}
Write-Host ""

# Step 3: Check Broker Service (FAST - with timeout)
Write-Host "[3/4] Checking Broker Service..." -ForegroundColor Yellow
try {
    # Use timeout to prevent hanging
    $pm2Check = Start-Job -ScriptBlock {
        pm2 list 2>&1 | Select-String "imperial-trade-broker-service"
    }
    
    $pm2Result = $pm2Check | Wait-Job -Timeout 5
    if ($pm2Result) {
        $brokerServiceStatus = $pm2Check | Receive-Job
        Stop-Job $pm2Check | Remove-Job -Force
        
        if ($brokerServiceStatus -match "online") {
            Write-Host "   ✅ Broker Service is ONLINE" -ForegroundColor Green
        } else {
            Write-Host "   ❌ Broker Service is NOT ONLINE" -ForegroundColor Red
            $errors += "Broker service not running. Start it: pm2 restart imperial-trade-broker-service"
        }
    } else {
        Stop-Job $pm2Check | Remove-Job -Force
        Write-Host "   ⚠️  PM2 check timed out" -ForegroundColor Yellow
        $warnings += "Could not verify broker service status (timeout)"
    }
} catch {
    Write-Host "   ⚠️  Error checking broker service: $_" -ForegroundColor Yellow
    $warnings += "Could not verify broker service status: $_"
}
Write-Host ""

# Step 4: Check Python MT5 library (FAST - simple import)
Write-Host "[4/4] Checking Python MT5 Library..." -ForegroundColor Yellow
try {
    # Use timeout to prevent hanging
    $pythonCheck = Start-Job -ScriptBlock {
        python -c "import MetaTrader5 as mt5; print('MT5_VERSION:', mt5.__version__)" 2>&1
    }
    
    $pythonResult = $pythonCheck | Wait-Job -Timeout 5
    if ($pythonResult) {
        $output = $pythonCheck | Receive-Job
        Stop-Job $pythonCheck | Remove-Job -Force
        
        if ($output -match "MT5_VERSION") {
            $version = ($output -split "MT5_VERSION: ")[1]
            Write-Host "   ✅ MetaTrader5 library installed (Version: $version)" -ForegroundColor Green
        } else {
            Write-Host "   ❌ MetaTrader5 library NOT INSTALLED" -ForegroundColor Red
            $errors += "Python MetaTrader5 library not installed. Install: pip install MetaTrader5"
        }
    } else {
        Stop-Job $pythonCheck | Remove-Job -Force
        Write-Host "   ⚠️  Python check timed out" -ForegroundColor Yellow
        $warnings += "Could not verify Python MT5 library (timeout)"
    }
} catch {
    Write-Host "   ⚠️  Error checking Python: $_" -ForegroundColor Yellow
    $warnings += "Could not verify Python MT5 library: $_"
}
Write-Host ""

# Summary
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  VERIFICATION SUMMARY" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

if ($errors.Count -eq 0 -and $warnings.Count -eq 0) {
    Write-Host "✅ ALL CHECKS PASSED - Autosync should work!" -ForegroundColor Green
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



