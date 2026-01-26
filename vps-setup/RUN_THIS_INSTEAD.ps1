# ============================================================================
# QUICK CHECK - Journal XX Pro Readiness (INLINE VERSION)
# ============================================================================
# Copy and paste this entire script into PowerShell on VPS
# ============================================================================

Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🔍 QUICK CHECK - Journal XX Pro Readiness" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# 1. Check MT5 Process
Write-Host "1. MT5 Broker Service Process:" -ForegroundColor Yellow
$mt5 = Get-Process -Name terminal64 -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*MT5_BrokerService*" }
if ($mt5) {
    Write-Host "   ✅ MT5 is running" -ForegroundColor Green
    Write-Host "   Path: $($mt5.Path)" -ForegroundColor Gray
} else {
    Write-Host "   ❌ MT5 NOT running" -ForegroundColor Red
    Write-Host "   ⚠️  Start MT5 from: C:\MT5_BrokerService\terminal64.exe /portable" -ForegroundColor Yellow
}

Write-Host ""

# 2. Check PM2 Services
Write-Host "2. PM2 Services:" -ForegroundColor Yellow
$pm2Status = pm2 status 2>&1
if ($pm2Status -match "imperial-trade-broker-service.*online") {
    Write-Host "   ✅ Broker Service: ONLINE" -ForegroundColor Green
} else {
    Write-Host "   ❌ Broker Service: NOT RUNNING" -ForegroundColor Red
    Write-Host "   ⚠️  Run: pm2 start C:\vps-broker-service\dist\index.js --name imperial-trade-broker-service" -ForegroundColor Yellow
}

if ($pm2Status -match "Imperial Price Feeder.*online") {
    Write-Host "   ✅ Price Feeder: ONLINE" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Price Feeder: NOT RUNNING (optional)" -ForegroundColor Yellow
}

Write-Host ""

# 3. Check Broker Service Port
Write-Host "3. Broker Service Port (3001):" -ForegroundColor Yellow
$port = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
if ($port) {
    Write-Host "   ✅ Port 3001 is listening" -ForegroundColor Green
} else {
    Write-Host "   ❌ Port 3001 NOT listening" -ForegroundColor Red
    Write-Host "   ⚠️  Broker service may not be running" -ForegroundColor Yellow
}

Write-Host ""

# 4. Check MT5 Data Folder
Write-Host "4. MT5 Data Folder:" -ForegroundColor Yellow
if (Test-Path "C:\MT5_BrokerService") {
    Write-Host "   ✅ C:\MT5_BrokerService exists" -ForegroundColor Green
} else {
    Write-Host "   ❌ C:\MT5_BrokerService NOT found" -ForegroundColor Red
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ STATUS CHECK COMPLETE!" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
