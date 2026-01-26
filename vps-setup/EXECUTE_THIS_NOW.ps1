# Execute Everything - Rebuild, Restart, Verify
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🚀 EXECUTING: REBUILD, RESTART, VERIFY" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Step 1: Rebuild
Write-Host "Step 1: Rebuilding..." -ForegroundColor Yellow
cd C:\vps-broker-service
npm run build
Write-Host ""

# Step 2: Restart
Write-Host "Step 2: Restarting broker service..." -ForegroundColor Yellow
pm2 restart imperial-trade-broker-service
Write-Host ""

# Step 3: Wait a moment
Write-Host "Step 3: Waiting 3 seconds..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
Write-Host ""

# Step 4: Verify
Write-Host "Step 4: Verifying..." -ForegroundColor Yellow
Write-Host "────────────────────────────────────────────────────────────" -ForegroundColor Gray

# Check PM2
Write-Host "PM2 Status:" -ForegroundColor Cyan
pm2 status
Write-Host ""

# Check Port
Write-Host "Port 3001:" -ForegroundColor Cyan
$port = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
if ($port) {
    Write-Host "  ✅ LISTENING" -ForegroundColor Green
} else {
    Write-Host "  ❌ NOT LISTENING" -ForegroundColor Red
}
Write-Host ""

# Check Python Scripts
Write-Host "Python Scripts:" -ForegroundColor Cyan
$test = Get-Content C:\vps-broker-service\python\test_connection.py -Raw
if ($test -match "C:\\Program Files\\MetaTrader 5\\terminal64.exe") {
    Write-Host "  ✅ test_connection.py: REVERTED" -ForegroundColor Green
} else {
    Write-Host "  ❌ test_connection.py: NOT REVERTED" -ForegroundColor Red
}
Write-Host ""

# Check MT5
Write-Host "MT5 Processes:" -ForegroundColor Cyan
$mt5 = Get-Process -Name terminal64 -ErrorAction SilentlyContinue
if ($mt5) {
    Write-Host "  ✅ MT5 Running ($($mt5.Count) process)" -ForegroundColor Green
    $mt5 | ForEach-Object { Write-Host "    - $($_.Path)" -ForegroundColor Gray }
} else {
    Write-Host "  ❌ MT5 Not Running" -ForegroundColor Red
}
Write-Host ""

Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ EXECUTION COMPLETE" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
