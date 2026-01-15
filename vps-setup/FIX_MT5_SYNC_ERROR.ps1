# Fix MT5 Synchronization Error
# Forces MT5 to rebuild database files that were causing Error [32]

Write-Host "🔧 Fixing MT5 Synchronization Error..." -ForegroundColor Cyan
Write-Host ""
Write-Host "This script will help you fix the 'synchronization process failed' error" -ForegroundColor Yellow
Write-Host "by forcing MT5 to rebuild its database files." -ForegroundColor Yellow
Write-Host ""
Write-Host "Manual Steps Required:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Open MT5 Terminal" -ForegroundColor White
Write-Host "2. Go to the 'Symbols' tab (left side panel)" -ForegroundColor White
Write-Host "3. Right-click on 'EURUSD' (or any symbol showing error)" -ForegroundColor White
Write-Host "4. Select 'Hide All'" -ForegroundColor White
Write-Host "5. Right-click again and select 'Show All'" -ForegroundColor White
Write-Host "6. Wait for MT5 to rebuild the database" -ForegroundColor White
Write-Host ""
Write-Host "This forces MT5 to release and rebuild the files that were locked." -ForegroundColor Cyan
Write-Host ""
Write-Host "Alternative: Close and reopen MT5 in portable mode" -ForegroundColor Yellow
Write-Host ""

# Check if MT5 is running
$mt5Process = Get-Process -Name terminal64 -ErrorAction SilentlyContinue
if ($mt5Process) {
    Write-Host "✅ MT5 is running (PID: $($mt5Process.Id))" -ForegroundColor Green
    Write-Host "   Please perform the manual steps above in the MT5 window" -ForegroundColor Yellow
} else {
    Write-Host "⚠️  MT5 is not running" -ForegroundColor Yellow
    Write-Host "   Start MT5 first, then perform the manual steps" -ForegroundColor Yellow
}

Write-Host ""
