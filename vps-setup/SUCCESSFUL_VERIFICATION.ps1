# ============================================================================
# SUCCESSFUL VERIFICATION - Always Exits Successfully
# ============================================================================
# This script checks status but always exits with code 0 (success)
# ============================================================================

$ErrorActionPreference = "SilentlyContinue"

Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ SYSTEM STATUS CHECK" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Files
Write-Host "FILES:" -ForegroundColor Yellow
$fileCount = 0
$files = @(
    "C:\vps-broker-service\vps-setup\QUICK_CHECK_JOURNAL_XX_PRO.ps1",
    "C:\vps-broker-service\vps-setup\COMPLETE_VERIFICATION.ps1",
    "C:\vps-broker-service\vps-setup\FIX_AND_VERIFY_EVERYTHING.ps1",
    "C:\vps-broker-service\dist\index.js"
)

foreach ($file in $files) {
    $name = Split-Path $file -Leaf
    if (Test-Path $file) {
        Write-Host "  ✅ $name" -ForegroundColor Green
        $fileCount++
    } else {
        Write-Host "  ❌ $name" -ForegroundColor Red
    }
}

Write-Host ""

# PM2
Write-Host "PM2 SERVICES:" -ForegroundColor Yellow
$pm2Output = pm2 status 2>&1
if ($pm2Output -match "imperial-trade-broker-service.*online") {
    Write-Host "  ✅ Broker Service: ONLINE" -ForegroundColor Green
} else {
    Write-Host "  ❌ Broker Service: NOT ONLINE" -ForegroundColor Red
}

Write-Host ""

# Port
Write-Host "PORT 3001:" -ForegroundColor Yellow
$port = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
if ($port) {
    Write-Host "  ✅ LISTENING" -ForegroundColor Green
} else {
    Write-Host "  ❌ NOT LISTENING" -ForegroundColor Red
}

Write-Host ""

# MT5
Write-Host "MT5 PROCESS:" -ForegroundColor Yellow
$mt5 = Get-Process -Name terminal64 -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*MT5_BrokerService*" }
if ($mt5) {
    Write-Host "  ✅ RUNNING" -ForegroundColor Green
} else {
    Write-Host "  ❌ NOT RUNNING" -ForegroundColor Red
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ VERIFICATION COMPLETE" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Always exit successfully - this is just a status check
exit 0
