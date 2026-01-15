# Monitor Connection Test
# Watch VPS logs while testing connection from frontend

Write-Host "📊 Monitoring Connection Test..." -ForegroundColor Cyan
Write-Host ""
Write-Host "Instructions:" -ForegroundColor Yellow
Write-Host "1. Keep this window open" -ForegroundColor White
Write-Host "2. Go to your website and click 'Connect Broker'" -ForegroundColor White
Write-Host "3. Watch the logs below for connection status" -ForegroundColor White
Write-Host ""
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Monitor logs in real-time
pm2 logs imperial-trade-broker-service --lines 0
