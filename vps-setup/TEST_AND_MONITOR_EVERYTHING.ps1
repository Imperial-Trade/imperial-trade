# Comprehensive Test and Monitor Script
# Tests end-to-end MT5 connection and monitors all services

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "  COMPREHENSIVE MT5 CONNECTION TEST & MONITORING" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check Service Status
Write-Host "[1/6] Checking Service Status..." -ForegroundColor Yellow
Write-Host ""
$services = pm2 list 2>&1 | Select-String -Pattern "Imperial Price Feeder|imperial-trade-broker-service"
if ($services) {
    Write-Host "✅ Services Running:" -ForegroundColor Green
    $services | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
} else {
    Write-Host "❌ Services not found" -ForegroundColor Red
}
Write-Host ""

# 2. Test Broker Service Health
Write-Host "[2/6] Testing Broker Service Health..." -ForegroundColor Yellow
try {
    $health = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 5
    $healthData = $health.Content | ConvertFrom-Json
    Write-Host "✅ Health Check: PASSED" -ForegroundColor Green
    Write-Host "   Status: $($healthData.status)" -ForegroundColor Gray
    Write-Host "   Uptime: $([math]::Round($healthData.uptime, 2)) seconds" -ForegroundColor Gray
} catch {
    Write-Host "❌ Health Check: FAILED" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Gray
}
Write-Host ""

# 3. Check Recent Logs
Write-Host "[3/6] Checking Recent Service Logs..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Last 10 lines from broker service:" -ForegroundColor Cyan
$recentLogs = pm2 logs imperial-trade-broker-service --lines 10 --nostream 2>&1 | Select-Object -Last 12
$recentLogs | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
Write-Host ""

# 4. Monitor Generic MT5 Process
Write-Host "[4/6] Checking Generic MT5 Process..." -ForegroundColor Yellow
$mt5Process = Get-Process | Where-Object { 
    $_.ProcessName -like "*terminal*" -or 
    $_.MainWindowTitle -like "*MetaTrader*" -or
    $_.MainWindowTitle -like "*MT5*"
} | Select-Object ProcessName, Id, MainWindowTitle

if ($mt5Process) {
    Write-Host "✅ MT5 Process Found:" -ForegroundColor Green
    $mt5Process | Format-Table -AutoSize
} else {
    Write-Host "⚠️  MT5 Process not found (may be running in background)" -ForegroundColor Yellow
}
Write-Host ""

# 5. Test VPS Connectivity
Write-Host "[5/6] Testing VPS External Connectivity..." -ForegroundColor Yellow
try {
    $externalHealth = Invoke-WebRequest -Uri "http://45.32.89.134:3001/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ External Access: PASSED" -ForegroundColor Green
    Write-Host "   VPS is accessible from Edge Functions" -ForegroundColor Gray
} catch {
    Write-Host "❌ External Access: FAILED" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Gray
}
Write-Host ""

# 6. Start Real-Time Monitoring
Write-Host "[6/6] Starting Real-Time Log Monitoring..." -ForegroundColor Yellow
Write-Host ""
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "  REAL-TIME MONITORING (Press Ctrl+C to stop)" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Monitoring broker service logs..." -ForegroundColor Gray
Write-Host "Waiting for connection attempts..." -ForegroundColor Gray
Write-Host ""

# Monitor logs in real-time
pm2 logs imperial-trade-broker-service --lines 0


