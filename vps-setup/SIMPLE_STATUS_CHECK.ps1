# ============================================================================
# SIMPLE STATUS CHECK - No Errors, Just Status
# ============================================================================

$ErrorActionPreference = "SilentlyContinue"  # Don't show errors, just check

Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📊 SIMPLE STATUS CHECK" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Files
Write-Host "FILES:" -ForegroundColor Yellow
$files = @(
    @{Name="QUICK_CHECK_JOURNAL_XX_PRO.ps1"; Path="C:\vps-broker-service\vps-setup\QUICK_CHECK_JOURNAL_XX_PRO.ps1"},
    @{Name="COMPLETE_VERIFICATION.ps1"; Path="C:\vps-broker-service\vps-setup\COMPLETE_VERIFICATION.ps1"},
    @{Name="Broker Service"; Path="C:\vps-broker-service\dist\index.js"},
    @{Name="MT5 Executable"; Path="C:\MT5_BrokerService\terminal64.exe"}
)

foreach ($file in $files) {
    if (Test-Path $file.Path) {
        Write-Host "  ✅ $($file.Name)" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $($file.Name)" -ForegroundColor Red
    }
}

Write-Host ""

# PM2
Write-Host "PM2 SERVICES:" -ForegroundColor Yellow
$pm2 = pm2 status 2>&1
if ($pm2 -match "imperial-trade-broker-service.*online") {
    Write-Host "  ✅ Broker Service: ONLINE" -ForegroundColor Green
} else {
    Write-Host "  ❌ Broker Service: NOT ONLINE" -ForegroundColor Red
}

if ($pm2 -match "Imperial Price Feeder.*online") {
    Write-Host "  ✅ Price Feeder: ONLINE" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Price Feeder: NOT ONLINE" -ForegroundColor Yellow
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
Write-Host "✅ CHECK COMPLETE" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Always exit successfully - this is just a status check
exit 0
