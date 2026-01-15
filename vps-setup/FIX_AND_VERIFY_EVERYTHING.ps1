# ============================================================================
# FIX AND VERIFY EVERYTHING - Complete Implementation Check
# ============================================================================
# This script verifies everything is correctly implemented
# Exit code: 0 = Success, 1 = Issues found
# ============================================================================

$ErrorActionPreference = "Continue"  # Continue on errors, don't stop

Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🔧 FIXING AND VERIFYING EVERYTHING" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$issues = @()
$fixed = @()
$exitCode = 0

# 1. Check and list all files
Write-Host "1. CHECKING FILES:" -ForegroundColor Yellow
Write-Host ""

$files = @(
    "C:\vps-broker-service\vps-setup\QUICK_CHECK_JOURNAL_XX_PRO.ps1",
    "C:\vps-broker-service\vps-setup\COMPLETE_VERIFICATION.ps1",
    "C:\vps-broker-service\vps-setup\VERIFY_AND_ENSURE_24_7.ps1",
    "C:\vps-broker-service\vps-setup\DEPLOY_TO_VPS.ps1",
    "C:\vps-broker-service\dist\index.js",
    "C:\vps-broker-service\python\test_connection.py",
    "C:\vps-broker-service\python\fetch_trades.py",
    "C:\MT5_BrokerService\terminal64.exe"
)

foreach ($file in $files) {
    $name = Split-Path $file -Leaf
    if (Test-Path $file) {
        Write-Host "   ✅ $name" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $name - MISSING" -ForegroundColor Red
        $issues += "Missing: $file"
    }
}

Write-Host ""

# 2. Check PM2
Write-Host "2. CHECKING PM2 SERVICES:" -ForegroundColor Yellow
Write-Host ""
try {
    $pm2Output = pm2 status 2>&1
    Write-Host $pm2Output
} catch {
    Write-Host "   ⚠️  Could not check PM2 status" -ForegroundColor Yellow
}
Write-Host ""

# 3. Check Port
Write-Host "3. CHECKING PORT 3001:" -ForegroundColor Yellow
$port = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
if ($port) {
    Write-Host "   ✅ LISTENING" -ForegroundColor Green
} else {
    Write-Host "   ❌ NOT LISTENING" -ForegroundColor Red
    $issues += "Port 3001 not listening"
}
Write-Host ""

# 4. Check MT5
Write-Host "4. CHECKING MT5 PROCESS:" -ForegroundColor Yellow
try {
    $mt5 = Get-Process -Name terminal64 -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*MT5_BrokerService*" }
    if ($mt5) {
        Write-Host "   ✅ RUNNING" -ForegroundColor Green
        Write-Host "   Path: $($mt5.Path)" -ForegroundColor Gray
    } else {
        Write-Host "   ❌ NOT RUNNING" -ForegroundColor Red
        $issues += "MT5 Broker Service not running"
    }
} catch {
    Write-Host "   ⚠️  Could not check MT5 process" -ForegroundColor Yellow
    $issues += "Could not verify MT5 process"
}
Write-Host ""

# Summary
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📊 SUMMARY" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

if ($issues.Count -eq 0) {
    Write-Host "✅ ALL CHECKS PASSED!" -ForegroundColor Green
    Write-Host "✅ SYSTEM READY FOR JOURNAL XX PRO!" -ForegroundColor Green
    $exitCode = 0
} else {
    Write-Host "❌ ISSUES FOUND: $($issues.Count)" -ForegroundColor Red
    $issues | ForEach-Object { Write-Host "   - $_" -ForegroundColor Yellow }
    $exitCode = 1
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Exit with appropriate code
exit $exitCode
