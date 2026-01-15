# Quick Fix for Error [32] - One-Command Solution
# Run this on VPS to fix the sharing violation issue

Write-Host "🔧 Quick Fix for Error [32]..." -ForegroundColor Cyan

# Kill all processes
Write-Host "Killing all MT5 and Python processes..." -ForegroundColor Yellow
taskkill /F /IM terminal64.exe 2>$null
taskkill /F /IM python.exe 2>$null
taskkill /F /IM pythonw.exe 2>$null
Start-Sleep -Seconds 5

# Start MT5 in portable mode
Write-Host "Starting MT5 in portable mode..." -ForegroundColor Yellow
Start-Process "C:\Program Files\MetaTrader 5\terminal64.exe" -ArgumentList "/portable"

Write-Host "✅ Done! Please:" -ForegroundColor Green
Write-Host "1. Wait for MT5 to open" -ForegroundColor White
Write-Host "2. Verify connection bars are green/blue" -ForegroundColor White
Write-Host "3. In MT5: Symbols → Right-click EURUSD → Hide All → Show All" -ForegroundColor White
Write-Host "4. Run: pm2 logs imperial-trade-broker-service" -ForegroundColor White
Write-Host "5. Test connection from website" -ForegroundColor White
