# ============================================================================
# LAUNCH MT5 CORRECTLY - Simple Launcher Script
# ============================================================================
# Use this script to ALWAYS launch MT5 in portable mode
# ============================================================================

$MT5Path = "C:\MT5_BrokerService\terminal64.exe"
$MT5Args = "/portable"

Write-Host "Launching MT5 in portable mode..." -ForegroundColor Cyan

if (Test-Path $MT5Path) {
    Start-Process -FilePath $MT5Path -ArgumentList $MT5Args
    Write-Host "✅ MT5 launched!" -ForegroundColor Green
    Write-Host ""
    Write-Host "VERIFICATION:" -ForegroundColor Yellow
    Write-Host "Go to: File > Open Data Folder" -ForegroundColor White
    Write-Host "Should show: C:\MT5_BrokerService" -ForegroundColor White
} else {
    Write-Host "❌ MT5 not found at: $MT5Path" -ForegroundColor Red
    Write-Host "Please run the setup script first!" -ForegroundColor Yellow
    exit 1
}
