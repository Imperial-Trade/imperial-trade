# ============================================================================
# CREATE EC MARKETS MT5 SHORTCUT (FOR PRICE FEEDER)
# ============================================================================
# Creates a shortcut for EC Markets MT5 - used by Price Feeder
# NOTE: This does NOT use portable mode (uses standard installation)
# ============================================================================

Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📊 Creating EC Markets MT5 Shortcut (Price Feeder)" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$desktop = [Environment]::GetFolderPath('Desktop')
Write-Host "Desktop: $desktop" -ForegroundColor Gray
Write-Host ""

# Check if standard MT5 installation exists
$mt5Path = "C:\Program Files\MetaTrader 5\terminal64.exe"
if (-not (Test-Path $mt5Path)) {
    Write-Host "❌ MT5 not found at: $mt5Path" -ForegroundColor Red
    Write-Host "Please install MetaTrader 5 first!" -ForegroundColor Yellow
    exit 1
}

Write-Host "Creating shortcut..." -ForegroundColor Yellow
$WshShell = New-Object -ComObject WScript.Shell
$shortcutPath = Join-Path $desktop "EC Markets MT5 (Price Feeder).lnk"

$Shortcut = $WshShell.CreateShortcut($shortcutPath)
$Shortcut.TargetPath = $mt5Path
$Shortcut.Arguments = ""  # NO /portable - uses standard installation
$Shortcut.WorkingDirectory = "C:\Program Files\MetaTrader 5"
$Shortcut.Description = "EC Markets MT5 for Price Feeder - Login: 81071266, Server: ECMarkets-MT5-Live01"
$Shortcut.IconLocation = "$mt5Path,0"
$Shortcut.Save()

Write-Host "✅ Shortcut created: $shortcutPath" -ForegroundColor Green
Write-Host ""

# Verify
Write-Host "Verifying shortcut..." -ForegroundColor Cyan
if (Test-Path $shortcutPath) {
    $verify = (New-Object -ComObject WScript.Shell).CreateShortcut($shortcutPath)
    Write-Host "✅ Shortcut verified!" -ForegroundColor Green
    Write-Host "  Location: $shortcutPath" -ForegroundColor Gray
    Write-Host "  Target: $($verify.TargetPath)" -ForegroundColor Gray
    Write-Host "  Arguments: $($verify.Arguments) (empty = standard installation)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "✅ Setup Complete!" -ForegroundColor Green
    Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "IMPORTANT:" -ForegroundColor Yellow
    Write-Host "• This shortcut is for Price Feeder (EC Markets MT5)" -ForegroundColor White
    Write-Host "• Login: 81071266" -ForegroundColor White
    Write-Host "• Server: ECMarkets-MT5-Live01" -ForegroundColor White
    Write-Host "• Keep MT5 open and logged in for Price Feeder to work" -ForegroundColor White
    Write-Host ""
    Write-Host "DIFFERENCE:" -ForegroundColor Cyan
    Write-Host "• EC Markets MT5 (this): Standard installation, NO /portable" -ForegroundColor Gray
    Write-Host "• MT5 Broker Service: Portable mode, uses /portable" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "❌ Shortcut creation failed!" -ForegroundColor Red
    exit 1
}
