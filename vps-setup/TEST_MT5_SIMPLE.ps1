# Simple MT5 Readiness Test
# Tests if MT5 can initialize and return terminal_info without hanging

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
    
    print("Getting terminal_info()...")
    terminal_info = mt5.terminal_info()
    
    if terminal_info:
        print("✅ terminal_info() returned data:")
        print(f"   Name: {terminal_info.name}")
        print(f"   Build: {terminal_info.build}")
        print(f"   Trade Allowed: {terminal_info.trade_allowed}")
        print(f"   Company: {terminal_info.company}")
        print(f"   Path: {terminal_info.path}")
        print("")
        print("✅ MT5 is READY - connection is NOT hanging")
    else:
        print("❌ ERROR: terminal_info() returned None")
        print("   This means MT5 is not fully initialized")
        sys.exit(1)
    
    mt5.shutdown()
    print("✅ Test completed successfully - MT5 is ready for API connections")
    
except Exception as e:
    print(f"❌ EXCEPTION: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
"@

$scriptPath = "$env:TEMP\test_mt5_simple.py"
$testScript | Out-File -FilePath $scriptPath -Encoding UTF8

Write-Host "Running simple MT5 test..." -ForegroundColor Yellow
Write-Host ""

# Run the test with timeout (30 seconds)
$job = Start-Job -ScriptBlock { param($path) python $path } -ArgumentList $scriptPath
$result = Wait-Job -Job $job -Timeout 30

if ($result) {
    $output = Receive-Job -Job $job
    Remove-Job -Job $job
    Write-Host $output
    $exitCode = 0
} else {
    Write-Host "Test timed out after 30 seconds"
    Stop-Job -Job $job
    Remove-Job -Job $job
    $exitCode = $null
}

Write-Host ""
if ($exitCode -eq 0) {
    Write-Host "✅ MT5 is READY - No hanging detected" -ForegroundColor Green
} elseif ($exitCode -eq $null) {
    Write-Host "❌ MT5 test TIMED OUT after 30 seconds" -ForegroundColor Red
    Write-Host "   This indicates MT5 is hanging or not responding" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Possible causes:" -ForegroundColor Yellow
    Write-Host "1. MT5 is not running" -ForegroundColor White
    Write-Host "2. Permission issue (UAC blocking)" -ForegroundColor White
    Write-Host "3. MT5 installation corrupted" -ForegroundColor White
    Write-Host "4. Ghost MT5 process running" -ForegroundColor White
    Write-Host ""
    Write-Host "Try:" -ForegroundColor Yellow
    Write-Host "1. Run: C:\vps-broker-service\LOWER_UAC_SETTINGS.ps1 (as Admin)" -ForegroundColor White
    Write-Host "2. Kill all terminal64.exe processes and restart MT5" -ForegroundColor White
    Write-Host "3. Restart the VPS" -ForegroundColor White
} else {
    Write-Host "❌ MT5 test FAILED (exit code: $exitCode)" -ForegroundColor Red
    Write-Host "   Check the error messages above" -ForegroundColor Yellow
}

# Cleanup
Remove-Item $scriptPath -ErrorAction SilentlyContinue

