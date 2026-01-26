# Verify Generic MT5 is logged in
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "  VERIFYING GENERIC MT5 LOGIN STATUS" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""

$genericPath = "C:\Program Files\MetaTrader 5\terminal64.exe"
$generic = Get-Process -Name terminal64 -ErrorAction SilentlyContinue | Where-Object { 
    $_.Path -eq $genericPath 
} | Select-Object -First 1

if ($generic) {
    Write-Host "✅ Generic MT5 is RUNNING (PID: $($generic.Id))" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  IMPORTANT: The Python script connects to Generic MT5, NOT EC Markets MT5" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please verify Generic MT5 is LOGGED IN with these credentials:" -ForegroundColor Cyan
    Write-Host "  Login:    800107112" -ForegroundColor White
    Write-Host "  Password: Demo@123" -ForegroundColor White
    Write-Host "  Server:   ECMarketsLtd-Demo" -ForegroundColor White
    Write-Host ""
    Write-Host "To check:" -ForegroundColor Yellow
    Write-Host "  1. Look at the Generic MT5 window title bar" -ForegroundColor Gray
    Write-Host "  2. It should show: '800107112 - ECMarketsLtd-Demo: Demo Account...'" -ForegroundColor Gray
    Write-Host "  3. If it shows 'Not connected' or no account, you need to log in" -ForegroundColor Gray
    Write-Host ""
    Write-Host "If Generic MT5 is NOT logged in:" -ForegroundColor Yellow
    Write-Host "  1. Click 'File' → 'Login to Trade Account'" -ForegroundColor Gray
    Write-Host "  2. Enter the credentials above" -ForegroundColor Gray
    Write-Host "  3. Click 'Login'" -ForegroundColor Gray
    Write-Host "  4. Keep Generic MT5 running and logged in" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "❌ Generic MT5 is NOT RUNNING" -ForegroundColor Red
    Write-Host "💡 Starting Generic MT5..." -ForegroundColor Yellow
    Start-Process $genericPath
    Write-Host "⏳ Waiting 15 seconds for MT5 to initialize..." -ForegroundColor Yellow
    Start-Sleep -Seconds 15
    Write-Host ""
    Write-Host "⚠️  Now please log in to Generic MT5 with:" -ForegroundColor Yellow
    Write-Host "  Login:    800107112" -ForegroundColor White
    Write-Host "  Password: Demo@123" -ForegroundColor White
    Write-Host "  Server:   ECMarketsLtd-Demo" -ForegroundColor White
    Write-Host ""
}

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""


