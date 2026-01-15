# Force MT5 to use True Portable Mode
# This script closes MT5 and restarts it in the isolated directory

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  FORCING TRUE PORTABLE MODE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Close all MT5 instances
Write-Host "Step 1: Closing all MT5 instances..." -ForegroundColor Yellow
taskkill /F /IM terminal64.exe 2>$null
Start-Sleep -Seconds 3
Write-Host "✅ All MT5 instances closed" -ForegroundColor Green
Write-Host ""

# Step 2: Verify isolated directory exists
Write-Host "Step 2: Verifying isolated directory..." -ForegroundColor Yellow
$brokerDir = "C:\MT5_BrokerService"
$terminalPath = "$brokerDir\terminal64.exe"

if (Test-Path $terminalPath) {
    Write-Host "✅ Isolated terminal found: $terminalPath" -ForegroundColor Green
} else {
    Write-Host "❌ Isolated terminal NOT found: $terminalPath" -ForegroundColor Red
    Write-Host "   Run NUCLEAR_FIX_ERROR_32.ps1 first!" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Step 3: Launch MT5 in TRUE portable mode
Write-Host "Step 3: Launching MT5 in TRUE portable mode..." -ForegroundColor Yellow
Write-Host "  Command: Start-Process `"$terminalPath`" -ArgumentList `/portable`" -ForegroundColor Gray

Start-Process -FilePath $terminalPath -ArgumentList "/portable"
Start-Sleep -Seconds 5

Write-Host "✅ MT5 launched with /portable argument" -ForegroundColor Green
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CRITICAL VERIFICATION" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "NOW DO THIS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. In MT5, go to: File > Open Data Folder" -ForegroundColor White
Write-Host ""
Write-Host "2. Check the path in the address bar:" -ForegroundColor White
Write-Host "   ✅ SUCCESS: Should show $brokerDir" -ForegroundColor Green
Write-Host "   ❌ FAIL: If it shows AppData\Roaming, close MT5 and run this script again" -ForegroundColor Red
Write-Host ""
Write-Host "3. If it still shows AppData\Roaming:" -ForegroundColor Yellow
Write-Host "   • Close MT5 completely" -ForegroundColor White
Write-Host "   • Delete: C:\Users\Administrator\AppData\Roaming\MetaQuotes\Terminal\D0E8209F77C8CF37AD8BF550E51FF075" -ForegroundColor White
Write-Host "   • Run this script again" -ForegroundColor White
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
