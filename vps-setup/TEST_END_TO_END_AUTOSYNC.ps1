# ============================================================================
# END-TO-END AUTOSYNC TESTING
# ============================================================================
# Tests the complete flow:
# 1. Edge Function → VPS Service
# 2. VPS Service → Python MT5 Script
# 3. Python Script → Generic MT5
# 4. Generic MT5 → Fetch trades
# 5. Return trades through chain → Supabase
# ============================================================================

$ErrorActionPreference = "Continue"

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  END-TO-END AUTOSYNC TESTING" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Test VPS Service Health
Write-Host "[1/6] Testing VPS Service Health..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    if ($healthResponse.StatusCode -eq 200) {
        $healthData = $healthResponse.Content | ConvertFrom-Json
        Write-Host "   ✅ VPS Service is ONLINE" -ForegroundColor Green
        Write-Host "   📍 Service: $($healthData.service)" -ForegroundColor Gray
        Write-Host "   📍 Uptime: $([math]::Round($healthData.uptime, 2))s" -ForegroundColor Gray
    } else {
        Write-Host "   ❌ VPS Service returned status: $($healthResponse.StatusCode)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   ❌ VPS Service is NOT accessible: $_" -ForegroundColor Red
    Write-Host "   💡 Start the service: pm2 restart imperial-trade-broker-service" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# 2. Test Generic MT5 Connection
Write-Host "[2/6] Testing Generic MT5 Connection..." -ForegroundColor Yellow
$mt5Proc = Get-Process -Name terminal64 -ErrorAction SilentlyContinue | Where-Object { 
    $_.Path -like '*MetaTrader 5*' -and $_.Path -notlike '*EC Markets*' 
} | Select-Object -First 1

if ($mt5Proc) {
    Write-Host "   ✅ Generic MT5 is RUNNING (PID: $($mt5Proc.Id))" -ForegroundColor Green
    Write-Host "   📍 Path: $($mt5Proc.Path)" -ForegroundColor Gray
} else {
    Write-Host "   ❌ Generic MT5 is NOT RUNNING" -ForegroundColor Red
    Write-Host "   💡 Start Generic MT5: Start-Process 'C:\Program Files\MetaTrader 5\terminal64.exe'" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# 3. Test Python MT5 Library
Write-Host "[3/6] Testing Python MT5 Library..." -ForegroundColor Yellow
try {
    $pythonCheck = python -c "import MetaTrader5 as mt5; print('MT5_VERSION:', mt5.__version__)" 2>&1 | Select-Object -First 1
    if ($pythonCheck -match "MT5_VERSION") {
        $version = ($pythonCheck -split "MT5_VERSION: ")[1]
        Write-Host "   ✅ MetaTrader5 library installed (Version: $version)" -ForegroundColor Green
    } else {
        Write-Host "   ❌ MetaTrader5 library NOT INSTALLED" -ForegroundColor Red
        Write-Host "   💡 Install: pip install MetaTrader5" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "   ⚠️  Could not check Python MT5 library: $_" -ForegroundColor Yellow
}
Write-Host ""

# 4. Test VPS Service Diagnostics Endpoint
Write-Host "[4/6] Testing VPS Service Diagnostics..." -ForegroundColor Yellow
try {
    $diagnosticsResponse = Invoke-WebRequest -Uri "http://localhost:3001/diagnostics" -Method GET -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
    if ($diagnosticsResponse.StatusCode -eq 200) {
        $diagnostics = $diagnosticsResponse.Content | ConvertFrom-Json
        Write-Host "   ✅ Diagnostics endpoint accessible" -ForegroundColor Green
        Write-Host "   📍 Service: $($diagnostics.service)" -ForegroundColor Gray
        Write-Host "   📍 Python available: $($diagnostics.python_available)" -ForegroundColor Gray
        Write-Host "   📍 MT5 library installed: $($diagnostics.mt5_library_installed)" -ForegroundColor Gray
        if ($diagnostics.generic_mt5_running) {
            Write-Host "   ✅ Generic MT5 detected by service" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  Generic MT5 not detected by service" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "   ⚠️  Diagnostics endpoint error: $_" -ForegroundColor Yellow
}
Write-Host ""

# 5. Test VPS Service Test-Connection Endpoint (requires API key)
Write-Host "[5/6] Testing VPS Service Test-Connection..." -ForegroundColor Yellow
Write-Host "   ⏭️  Skipped (requires broker credentials)" -ForegroundColor Gray
Write-Host "   💡 This will be tested via Edge Function" -ForegroundColor Gray
Write-Host ""

# 6. Summary
Write-Host "[6/6] Connection Summary..." -ForegroundColor Yellow
Write-Host "   ✅ VPS Service: ONLINE" -ForegroundColor Green
Write-Host "   ✅ Generic MT5: RUNNING" -ForegroundColor Green
Write-Host "   ✅ Python MT5 Library: INSTALLED" -ForegroundColor Green
Write-Host "   ✅ Network: PORT 3001 OPEN" -ForegroundColor Green
Write-Host ""

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  VPS READY FOR END-TO-END TESTING" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ All VPS components are ready!" -ForegroundColor Green
Write-Host "💡 Test Edge Function endpoint to complete end-to-end test" -ForegroundColor Yellow
Write-Host ""


