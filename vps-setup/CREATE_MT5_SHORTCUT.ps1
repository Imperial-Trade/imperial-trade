# ============================================================================
# CREATE MT5 BROKER SERVICE SHORTCUT
# ============================================================================
# Creates a desktop shortcut that ALWAYS opens MT5 in portable mode
# ============================================================================

Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🚀 Creating MT5 Broker Service Shortcut" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Get desktop path
$desktopPath = [Environment]::GetFolderPath('Desktop')
Write-Host "Desktop path: $desktopPath" -ForegroundColor Gray
Write-Host ""

# Create shortcut
$WshShell = New-Object -ComObject WScript.Shell
$shortcutPath = Join-Path $desktopPath "MT5 Broker Service.lnk"

Write-Host "Creating shortcut: $shortcutPath" -ForegroundColor Yellow

$Shortcut = $WshShell.CreateShortcut($shortcutPath)
$Shortcut.TargetPath = "C:\MT5_BrokerService\terminal64.exe"
$Shortcut.Arguments = "/portable"
$Shortcut.WorkingDirectory = "C:\MT5_BrokerService"
$Shortcut.Description = "MT5 Broker Service - Always uses isolated folder (C:\MT5_BrokerService)"
$Shortcut.IconLocation = "C:\MT5_BrokerService\terminal64.exe,0"
$Shortcut.Save()

Write-Host "✅ Shortcut created successfully!" -ForegroundColor Green
Write-Host ""

# Verify
Write-Host "Verifying shortcut..." -ForegroundColor Cyan
if (Test-Path $shortcutPath) {
    $verify = (New-Object -ComObject WScript.Shell).CreateShortcut($shortcutPath)
    Write-Host "✅ Shortcut verified!" -ForegroundColor Green
    Write-Host "  Location: $shortcutPath" -ForegroundColor Gray
    Write-Host "  Target: $($verify.TargetPath)" -ForegroundColor Gray
    Write-Host "  Arguments: $($verify.Arguments)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "✅ Setup Complete!" -ForegroundColor Green
    Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "HOW TO USE:" -ForegroundColor Yellow
    Write-Host "1. Look for 'MT5 Broker Service.lnk' on your Desktop" -ForegroundColor White
    Write-Host "2. Double-click it to open MT5" -ForegroundColor White
    Write-Host "3. MT5 will ALWAYS use: C:\MT5_BrokerService" -ForegroundColor White
    Write-Host ""
    Write-Host "VERIFICATION:" -ForegroundColor Yellow
    Write-Host "After opening MT5, go to: File > Open Data Folder" -ForegroundColor White
    Write-Host "Should show: C:\MT5_BrokerService" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "❌ Shortcut creation failed!" -ForegroundColor Red
    exit 1
}
