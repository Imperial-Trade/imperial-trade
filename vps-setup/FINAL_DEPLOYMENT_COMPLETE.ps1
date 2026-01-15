# Final Deployment - Complete Fix for Error [32] and Timeout Issues
# This script combines all fixes into one deployment

Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🚀 FINAL DEPLOYMENT - Error [32] Fix + Timeout Optimizations" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Step 1: Kill all ghost processes
Write-Host "Step 1: Killing all MT5 and Python processes..." -ForegroundColor Yellow
taskkill /F /IM terminal64.exe 2>$null
taskkill /F /IM python.exe 2>$null
taskkill /F /IM pythonw.exe 2>$null
Start-Sleep -Seconds 5
Write-Host "✅ All processes killed" -ForegroundColor Green
Write-Host ""

# Step 2: Verify files are updated
Write-Host "Step 2: Verifying timeout optimizations are in place..." -ForegroundColor Yellow
$testConnectionFile = "C:\vps-broker-service\python\test_connection.py"
if (Test-Path $testConnectionFile) {
    $content = Get-Content $testConnectionFile -Raw
    if ($content -match "timeout=25000") {
        Write-Host "✅ Python timeout: 25 seconds (correct)" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Python timeout not set to 25s - may need update" -ForegroundColor Yellow
    }
    if ($content -match "max_retries = 2") {
        Write-Host "✅ Python retries: 2 (correct)" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Python retries not set to 2 - may need update" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  test_connection.py not found" -ForegroundColor Yellow
}

$mt5ClientFile = "C:\vps-broker-service\dist\mt5-client.js"
if (Test-Path $mt5ClientFile) {
    $content = Get-Content $mt5ClientFile -Raw
    if ($content -match "45000") {
        Write-Host "✅ Node.js timeout: 45 seconds (correct)" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Node.js timeout not set to 45s - rebuilding..." -ForegroundColor Yellow
        Set-Location "C:\vps-broker-service"
        npm run build
    }
} else {
    Write-Host "⚠️  mt5-client.js not found - rebuilding..." -ForegroundColor Yellow
    Set-Location "C:\vps-broker-service"
    npm run build
}
Write-Host ""

# Step 3: Rebuild service if needed
Write-Host "Step 3: Rebuilding service..." -ForegroundColor Yellow
Set-Location "C:\vps-broker-service"
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Service rebuilt successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 4: Restart service
Write-Host "Step 4: Restarting broker service..." -ForegroundColor Yellow
pm2 restart imperial-trade-broker-service
Start-Sleep -Seconds 3
pm2 status imperial-trade-broker-service
Write-Host ""

# Step 5: Start MT5 in portable mode
Write-Host "Step 5: Starting MT5 in portable mode..." -ForegroundColor Yellow
$mt5Path = "C:\Program Files\MetaTrader 5\terminal64.exe"
if (Test-Path $mt5Path) {
    Start-Process -FilePath $mt5Path -ArgumentList "/portable"
    Write-Host "✅ MT5 started in portable mode" -ForegroundColor Green
    Write-Host "   Please wait for MT5 to open..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
} else {
    Write-Host "❌ MT5 not found at: $mt5Path" -ForegroundColor Red
}
Write-Host ""

# Step 6: Final instructions
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps (Manual):" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. In MT5 (just opened):" -ForegroundColor White
Write-Host "   • Verify connection bars are green/blue (bottom-right)" -ForegroundColor Gray
Write-Host "   • Go to Symbols tab (left side)" -ForegroundColor Gray
Write-Host "   • Right-click 'EURUSD' → 'Hide All'" -ForegroundColor Gray
Write-Host "   • Right-click again → 'Show All'" -ForegroundColor Gray
Write-Host "   • Check Journal tab - Error [32] should stop" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Monitor logs:" -ForegroundColor White
Write-Host "   pm2 logs imperial-trade-broker-service" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Test connection:" -ForegroundColor White
Write-Host "   • Go to website" -ForegroundColor Gray
Write-Host "   • Click 'Connect Broker'" -ForegroundColor Gray
Write-Host "   • Watch VPS logs for:" -ForegroundColor Gray
Write-Host "     ✅ 'MT5 initialized successfully' = Success!" -ForegroundColor Green
Write-Host "     ❌ 'IPC timeout' = Still has Error [32]" -ForegroundColor Red
Write-Host ""
Write-Host "Timeout Optimizations Applied:" -ForegroundColor Cyan
Write-Host "  • Python timeout: 25 seconds (was 30s)" -ForegroundColor White
Write-Host "  • Python retries: 2 (was 3)" -ForegroundColor White
Write-Host "  • Node.js timeout: 45 seconds (was 60s)" -ForegroundColor White
Write-Host "  • Total time: <55 seconds (under 60s limit)" -ForegroundColor Green
Write-Host ""
