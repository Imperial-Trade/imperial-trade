# ============================================================================
# RUN AND SHOW RESULTS - Execute and show everything
# ============================================================================

$ErrorActionPreference = "Continue"

Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🔍 COMPLETE SYSTEM CHECK" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$allGood = $true

# 1. Files
Write-Host "1. FILES:" -ForegroundColor Yellow
$files = @(
    "C:\vps-broker-service\vps-setup\QUICK_CHECK_JOURNAL_XX_PRO.ps1",
    "C:\vps-broker-service\vps-setup\SUCCESSFUL_VERIFICATION.ps1",
    "C:\vps-broker-service\vps-setup\DIAGNOSE_FAILURE.ps1",
    "C:\vps-broker-service\dist\index.js",
    "C:\vps-broker-service\python\test_connection.py",
    "C:\MT5_BrokerService\terminal64.exe"
)

foreach ($file in $files) {
    $name = Split-Path $file -Leaf
    if (Test-Path $file) {
        Write-Host "   ✅ $name" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $name - MISSING" -ForegroundColor Red
        $allGood = $false
    }
}

Write-Host ""

# 2. PM2
Write-Host "2. PM2 SERVICES:" -ForegroundColor Yellow
try {
    $pm2 = pm2 status 2>&1
    Write-Host $pm2
    if ($pm2 -match "imperial-trade-broker-service.*online") {
        Write-Host "   ✅ Broker Service: ONLINE" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Broker Service: NOT ONLINE" -ForegroundColor Red
        $allGood = $false
    }
} catch {
    Write-Host "   ❌ PM2 Error: $_" -ForegroundColor Red
    $allGood = $false
}

Write-Host ""

# 3. Port
Write-Host "3. PORT 3001:" -ForegroundColor Yellow
try {
    $port = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
    if ($port) {
        Write-Host "   ✅ LISTENING" -ForegroundColor Green
    } else {
        Write-Host "   ❌ NOT LISTENING" -ForegroundColor Red
        $allGood = $false
    }
} catch {
    Write-Host "   ❌ Port check error: $_" -ForegroundColor Red
    $allGood = $false
}

Write-Host ""

# 4. MT5
Write-Host "4. MT5 PROCESS:" -ForegroundColor Yellow
try {
    $mt5 = Get-Process -Name terminal64 -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*MT5_BrokerService*" }
    if ($mt5) {
        Write-Host "   ✅ RUNNING" -ForegroundColor Green
        Write-Host "   Path: $($mt5.Path)" -ForegroundColor Gray
    } else {
        Write-Host "   ❌ NOT RUNNING" -ForegroundColor Red
        $allGood = $false
    }
} catch {
    Write-Host "   ❌ MT5 check error: $_" -ForegroundColor Red
    $allGood = $false
}

Write-Host ""

# Summary
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
if ($allGood) {
    Write-Host "✅ ALL CHECKS PASSED - SYSTEM READY!" -ForegroundColor Green
} else {
    Write-Host "❌ SOME CHECKS FAILED - SEE ABOVE" -ForegroundColor Red
}
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Always exit 0 - this is just a status check
exit 0
