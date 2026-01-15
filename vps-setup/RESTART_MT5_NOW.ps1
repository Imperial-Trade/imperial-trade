# Restart MT5 in Portable Mode - Run This on VPS
# Right-click and "Run with PowerShell" or run from PowerShell

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RESTARTING MT5 IN PORTABLE MODE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Close MT5
Write-Host "Step 1: Closing MT5..." -ForegroundColor Yellow
taskkill /F /IM terminal64.exe
Start-Sleep -Seconds 3
Write-Host "✅ MT5 closed" -ForegroundColor Green
Write-Host ""

# Step 2: Delete AppData folder
Write-Host "Step 2: Deleting AppData folder..." -ForegroundColor Yellow
$appDataPath = "C:\Users\Administrator\AppData\Roaming\MetaQuotes\Terminal\D0E8209F77C8CF37AD8BF550E51FF075"
if (Test-Path $appDataPath) {
    Remove-Item -Path $appDataPath -Recurse -Force
    Write-Host "✅ AppData folder deleted" -ForegroundColor Green
} else {
    Write-Host "✅ AppData folder already deleted" -ForegroundColor Green
}
Write-Host ""

# Step 3: Start MT5 in portable mode
Write-Host "Step 3: Starting MT5 in portable mode..." -ForegroundColor Yellow
$terminalPath = "C:\MT5_BrokerService\terminal64.exe"
if (Test-Path $terminalPath) {
    Start-Process -FilePath $terminalPath -ArgumentList "/portable"
    Write-Host "✅ MT5 started with /portable argument" -ForegroundColor Green
} else {
    Write-Host "❌ Terminal not found: $terminalPath" -ForegroundColor Red
    Write-Host "   Run NUCLEAR_FIX_ERROR_32.ps1 first!" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Step 4: Wait and verify
Write-Host "Step 4: Waiting for MT5 to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

$mt5Process = Get-Process -Name terminal64 -ErrorAction SilentlyContinue
if ($mt5Process) {
    Write-Host "✅ MT5 is running (PID: $($mt5Process.Id))" -ForegroundColor Green
} else {
    Write-Host "⚠️  MT5 process not found (may need more time)" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CRITICAL VERIFICATION" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "NOW DO THIS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. In MT5 window, go to: File > Open Data Folder" -ForegroundColor White
Write-Host ""
Write-Host "2. Check the path in the address bar:" -ForegroundColor White
Write-Host "   ✅ SUCCESS: Should show C:\MT5_BrokerService" -ForegroundColor Green
Write-Host "   ❌ FAIL: If it shows AppData\Roaming, close MT5 and run this script again" -ForegroundColor Red
Write-Host ""
Write-Host "3. If it still shows AppData\Roaming:" -ForegroundColor Yellow
Write-Host "   • Close MT5 completely" -ForegroundColor White
Write-Host "   • Manually delete: C:\Users\Administrator\AppData\Roaming\MetaQuotes\Terminal\D0E8209F77C8CF37AD8BF550E51FF075" -ForegroundColor White
Write-Host "   • Run this script again" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
