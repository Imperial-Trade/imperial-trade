# ============================================================================
# LOGIN TO GENERIC MT5 WITH EC MARKETS DEMO ACCOUNT
# ============================================================================
# This script helps log in to Generic MT5 manually
# ============================================================================

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "  LOGGING IN TO GENERIC MT5" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""

# Check if Generic MT5 is running
$mt5Path = "C:\Program Files\MetaTrader 5\terminal64.exe"
$mt5Proc = Get-Process -Name terminal64 -ErrorAction SilentlyContinue | Where-Object { 
    $_.Path -like '*MetaTrader 5*' -and $_.Path -notlike '*EC Markets*' 
} | Select-Object -First 1

if (-not $mt5Proc) {
    Write-Host "⚠️  Generic MT5 is NOT RUNNING" -ForegroundColor Yellow
    Write-Host "💡 Starting Generic MT5..." -ForegroundColor Yellow
    Start-Process $mt5Path
    Write-Host "⏳ Waiting 15 seconds for MT5 to initialize..." -ForegroundColor Yellow
    Start-Sleep -Seconds 15
    Write-Host ""
} else {
    Write-Host "✅ Generic MT5 is RUNNING (PID: $($mt5Proc.Id))" -ForegroundColor Green
    Write-Host ""
}

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "  MANUAL LOGIN REQUIRED" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Please manually log in to Generic MT5 with these credentials:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   Login:    800107112" -ForegroundColor White
Write-Host "   Password: Demo@123" -ForegroundColor White
Write-Host "   Server:   ECMarketsLtd-Demo" -ForegroundColor White
Write-Host ""
Write-Host "Steps:" -ForegroundColor Cyan
Write-Host "   1. Open Generic MT5 (if not already open)" -ForegroundColor Gray
Write-Host "   2. Click 'File' → 'Login to Trade Account'" -ForegroundColor Gray
Write-Host "   3. Enter the credentials above" -ForegroundColor Gray
Write-Host "   4. Click 'Login'" -ForegroundColor Gray
Write-Host "   5. Keep Generic MT5 running and logged in" -ForegroundColor Gray
Write-Host "   6. Then retry connection test in Journal XX Pro" -ForegroundColor Gray
Write-Host ""
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""


