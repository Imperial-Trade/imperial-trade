# ============================================================================
# ALWAYS OPEN CORRECT MT5 - Portable Mode Launcher
# ============================================================================
# This script ensures MT5 ALWAYS opens from the isolated folder with /portable
# ============================================================================

Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🚀 Setting Up Correct MT5 Launcher" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Step 1: Close all existing MT5 processes
Write-Host "Step 1: Closing all MT5 processes..." -ForegroundColor Yellow
taskkill /F /IM terminal64.exe /T 2>&1 | Out-Null
Start-Sleep -Seconds 3
Write-Host "✅ All MT5 processes closed" -ForegroundColor Green
Write-Host ""

# Step 2: Delete old shortcuts (they might open wrong MT5)
Write-Host "Step 2: Deleting old shortcuts..." -ForegroundColor Yellow
$desktopPaths = @(
    "$env:PUBLIC\Desktop",
    "$env:USERPROFILE\Desktop"
)

foreach ($desktop in $desktopPaths) {
    if (Test-Path $desktop) {
        Get-ChildItem -Path $desktop -Filter '*MT5*' -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
        Get-ChildItem -Path $desktop -Filter '*MetaTrader*' -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
        Get-ChildItem -Path $desktop -Filter '*terminal*' -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
    }
}
Write-Host "✅ Old shortcuts deleted" -ForegroundColor Green
Write-Host ""

# Step 3: Create correct shortcut with /portable argument
Write-Host "Step 3: Creating correct shortcut..." -ForegroundColor Yellow
$WshShell = New-Object -ComObject WScript.Shell

# Create shortcut on Public Desktop (visible to all users)
$Shortcut = $WshShell.CreateShortcut("$env:PUBLIC\Desktop\MT5 Broker Service.lnk")
$Shortcut.TargetPath = "C:\MT5_BrokerService\terminal64.exe"
$Shortcut.Arguments = "/portable"
$Shortcut.WorkingDirectory = "C:\MT5_BrokerService"
$Shortcut.Description = "MT5 Broker Service - Portable Mode (Always uses isolated folder)"
$Shortcut.IconLocation = "C:\MT5_BrokerService\terminal64.exe,0"
$Shortcut.Save()

Write-Host "✅ Shortcut created: $env:PUBLIC\Desktop\MT5 Broker Service.lnk" -ForegroundColor Green
Write-Host ""

# Step 4: Launch MT5 correctly
Write-Host "Step 4: Launching MT5 in portable mode..." -ForegroundColor Yellow
Start-Process "C:\MT5_BrokerService\terminal64.exe" -ArgumentList "/portable"
Start-Sleep -Seconds 5
Write-Host "✅ MT5 launched!" -ForegroundColor Green
Write-Host ""

# Step 5: Verification instructions
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "VERIFICATION:" -ForegroundColor Yellow
Write-Host "1. In MT5, go to: File > Open Data Folder" -ForegroundColor White
Write-Host "2. The path MUST show: C:\MT5_BrokerService" -ForegroundColor White
Write-Host "3. If it shows AppData\Roaming, close MT5 and double-click the desktop shortcut" -ForegroundColor Yellow
Write-Host ""
Write-Host "FROM NOW ON:" -ForegroundColor Cyan
Write-Host "• Always use the desktop shortcut: 'MT5 Broker Service.lnk'" -ForegroundColor White
Write-Host "• This shortcut ALWAYS uses /portable argument" -ForegroundColor White
Write-Host "• Never double-click terminal64.exe directly" -ForegroundColor Yellow
Write-Host ""
