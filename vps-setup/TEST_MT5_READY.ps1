# Quick Test: Check if MT5 is ready for API connections
# This tests the basic MT5 initialization without login

Write-Host "=== TESTING MT5 READINESS ===" -ForegroundColor Cyan
Write-Host ""

# Create a temporary Python test script
$testScript = @"
import MetaTrader5 as mt5
import sys

try:
    print("Initializing MT5...")
    if not mt5.initialize(path=r"C:\Program Files\MetaTrader 5\terminal64.exe"):
        error = mt5.last_error()
        print(f"ERROR: MT5 initialization failed: {error}")
        sys.exit(1)
    
    print("✅ MT5 initialized successfully")
    
    terminal_info = mt5.terminal_info()
    if terminal_info:
        print(f"✅ Terminal Info retrieved:")
        print(f"   Name: {terminal_info.name}")
        print(f"   Build: {terminal_info.build}")
        print(f"   Trade Allowed: {terminal_info.trade_allowed}")
        print("✅ MT5 is READY for API connections")
    else:
        print("❌ ERROR: terminal_info() returned None")
        print("   This means MT5 is not fully initialized")
        sys.exit(1)
    
    mt5.shutdown()
    print("✅ Test completed successfully")
    
except Exception as e:
    print(f"❌ EXCEPTION: {e}")
    sys.exit(1)
"@

$scriptPath = "$env:TEMP\test_mt5_ready.py"
$testScript | Out-File -FilePath $scriptPath -Encoding UTF8

Write-Host "Running MT5 readiness test..." -ForegroundColor Yellow
Write-Host ""

# Run the test
python $scriptPath

$exitCode = $LASTEXITCODE

Write-Host ""
if ($exitCode -eq 0) {
    Write-Host "✅ MT5 is READY for API connections" -ForegroundColor Green
} else {
    Write-Host "❌ MT5 is NOT READY. Check the errors above." -ForegroundColor Red
    Write-Host ""
    Write-Host "Common fixes:" -ForegroundColor Yellow
    Write-Host "1. Ensure Generic MT5 is running" -ForegroundColor White
    Write-Host "2. Log into MT5 manually first" -ForegroundColor White
    Write-Host "3. Close all popup windows in MT5" -ForegroundColor White
    Write-Host "4. Run this script as Administrator" -ForegroundColor White
}

# Cleanup
Remove-Item $scriptPath -ErrorAction SilentlyContinue


