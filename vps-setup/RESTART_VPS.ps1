# Restart VPS after UAC changes

Write-Host "=== RESTARTING VPS ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "UAC has been set to 'Never Notify'" -ForegroundColor Yellow
Write-Host "Restarting in 10 seconds to apply changes..." -ForegroundColor Yellow
Write-Host ""
Write-Host "After restart, MT5 will need to be opened with matching privileges:" -ForegroundColor White
Write-Host "  - If services run as Admin: Open MT5 as Administrator" -ForegroundColor White
Write-Host "  - If services run as User: Open MT5 normally" -ForegroundColor White
Write-Host ""

Start-Sleep -Seconds 10
Restart-Computer -Force

