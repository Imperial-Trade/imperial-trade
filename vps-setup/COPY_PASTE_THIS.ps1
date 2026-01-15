# ============================================================================
# COPY AND PASTE THIS ENTIRE BLOCK INTO POWERSHELL
# ============================================================================

$desktop = [Environment]::GetFolderPath('Desktop')
Write-Host "Desktop: $desktop" -ForegroundColor Cyan
Write-Host ""

Write-Host "Creating shortcut..." -ForegroundColor Yellow
$WshShell = New-Object -ComObject WScript.Shell
$shortcutPath = Join-Path $desktop "MT5 Broker Service.lnk"

$Shortcut = $WshShell.CreateShortcut($shortcutPath)
$Shortcut.TargetPath = "C:\MT5_BrokerService\terminal64.exe"
$Shortcut.Arguments = "/portable"
$Shortcut.WorkingDirectory = "C:\MT5_BrokerService"
$Shortcut.Description = "MT5 Broker Service - Always uses isolated folder"
$Shortcut.IconLocation = "C:\MT5_BrokerService\terminal64.exe,0"
$Shortcut.Save()

Write-Host "✅ Shortcut created: $shortcutPath" -ForegroundColor Green
Write-Host ""
Write-Host "VERIFICATION:" -ForegroundColor Cyan
if (Test-Path $shortcutPath) {
    Write-Host "✅ Shortcut exists!" -ForegroundColor Green
    $verify = (New-Object -ComObject WScript.Shell).CreateShortcut($shortcutPath)
    Write-Host "  Target: $($verify.TargetPath)" -ForegroundColor Gray
    Write-Host "  Arguments: $($verify.Arguments)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "NEXT STEPS:" -ForegroundColor Yellow
    Write-Host "1. Press F5 on your desktop to refresh" -ForegroundColor White
    Write-Host "2. Look for 'MT5 Broker Service.lnk' on your Desktop" -ForegroundColor White
    Write-Host "3. Double-click it to open MT5" -ForegroundColor White
} else {
    Write-Host "❌ Shortcut creation failed!" -ForegroundColor Red
}
