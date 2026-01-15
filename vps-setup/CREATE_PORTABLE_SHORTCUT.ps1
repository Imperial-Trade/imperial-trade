# Create Desktop Shortcut for Portable MT5
# Run this in Administrator PowerShell

Write-Host "Creating desktop shortcut for portable MT5..." -ForegroundColor Cyan

$targetPath = "C:\MT5_BrokerService\terminal64.exe"
$shortcutPath = "$env:USERPROFILE\Desktop\MT5_BrokerService_Portable.lnk"

# Create shortcut
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($shortcutPath)
$Shortcut.TargetPath = $targetPath
$Shortcut.Arguments = "/portable"
$Shortcut.WorkingDirectory = "C:\MT5_BrokerService"
$Shortcut.Description = "MT5 Broker Service - Portable Mode"
$Shortcut.Save()

Write-Host "✅ Shortcut created: $shortcutPath" -ForegroundColor Green
Write-Host ""
Write-Host "NOW:" -ForegroundColor Yellow
Write-Host "1. Close ALL MT5 windows" -ForegroundColor White
Write-Host "2. Delete AppData folder (if it exists)" -ForegroundColor White
Write-Host "3. Double-click the NEW shortcut on desktop" -ForegroundColor White
Write-Host "4. Verify: File > Open Data Folder should show C:\MT5_BrokerService" -ForegroundColor Cyan
