# Test MT5 Connection Script
# Run this on the VPS to diagnose and fix MT5 connection issues

Write-Host "=== MT5 Connection Diagnostic ===" -ForegroundColor Cyan
Write-Host ""

# Check if MT5 is running
Write-Host "1. Checking if MT5 Terminal is running..." -ForegroundColor Yellow
$mt5Process = Get-Process -Name "terminal64" -ErrorAction SilentlyContinue
if ($mt5Process) {
    Write-Host "   ✅ MT5 Terminal is running" -ForegroundColor Green
    Write-Host "   Process ID: $($mt5Process.Id)" -ForegroundColor Gray
    Write-Host "   Session: $($mt5Process.SessionId)" -ForegroundColor Gray
} else {
    Write-Host "   ❌ MT5 Terminal is NOT running!" -ForegroundColor Red
    Write-Host "   Please start MT5 Terminal and log in" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Check MT5 path
Write-Host "2. Checking MT5 installation path..." -ForegroundColor Yellow
$mt5Path = "C:\Program Files\MetaTrader 5\terminal64.exe"
if (Test-Path $mt5Path) {
    Write-Host "   ✅ MT5 found at: $mt5Path" -ForegroundColor Green
} else {
    Write-Host "   ❌ MT5 NOT found at: $mt5Path" -ForegroundColor Red
    Write-Host "   Searching for MT5..." -ForegroundColor Yellow
    $found = Get-ChildItem "C:\Program Files" -Recurse -Filter "terminal64.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) {
        Write-Host "   Found MT5 at: $($found.FullName)" -ForegroundColor Cyan
        Write-Host "   Update python scripts to use this path!" -ForegroundColor Yellow
    }
}
Write-Host ""

# Test Python MT5 connection
Write-Host "3. Testing Python MT5 connection..." -ForegroundColor Yellow
cd C:\vps-broker-service

$testScript = @'
import MetaTrader5 as mt5
import sys

try:
    # Try to initialize MT5
    mt5_path = r"C:\Program Files\MetaTrader 5\terminal64.exe"
    print(f"Attempting to initialize MT5 at: {mt5_path}")
    
    initialized = mt5.initialize(path=mt5_path)
    
    if initialized:
        print("✅ MT5 initialized successfully!")
        
        # Get terminal info
        terminal_info = mt5.terminal_info()
        if terminal_info:
            print(f"   Terminal: {terminal_info.name}")
            print(f"   Company: {terminal_info.company}")
            print(f"   Path: {terminal_info.path}")
            print(f"   Connected: {terminal_info.connected}")
        
        mt5.shutdown()
        sys.exit(0)
    else:
        error = mt5.last_error()
        print(f"❌ MT5 initialization failed!")
        print(f"   Error code: {error[0] if isinstance(error, tuple) else 'Unknown'}")
        print(f"   Error message: {error[1] if isinstance(error, tuple) else str(error)}")
        sys.exit(1)
        
except Exception as e:
    print(f"❌ Exception: {str(e)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
'@

$testScript | Out-File -FilePath "test_mt5_init.py" -Encoding UTF8
python test_mt5_init.py
$pythonExitCode = $LASTEXITCODE
Remove-Item "test_mt5_init.py" -ErrorAction SilentlyContinue

Write-Host ""

if ($pythonExitCode -eq 0) {
    Write-Host "✅ Python can connect to MT5!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Your MT5 connection is working. Try the broker connection again." -ForegroundColor Green
} else {
    Write-Host "❌ Python CANNOT connect to MT5!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Solutions:" -ForegroundColor Yellow
    Write-Host "   1. Close MT5 Terminal completely" -ForegroundColor White
    Write-Host "   2. Open MT5 Terminal again" -ForegroundColor White
    Write-Host "   3. Log in to your account" -ForegroundColor White
    Write-Host "   4. Keep MT5 Terminal open (don't minimize to tray)" -ForegroundColor White
    Write-Host "   5. Run this script again" -ForegroundColor White
    Write-Host ""
    Write-Host "If still failing:" -ForegroundColor Yellow
    Write-Host "   - Check MT5 Options → Expert Advisors → Enable 'Allow automated trading'" -ForegroundColor White
    Write-Host "   - Restart both MT5 and this service" -ForegroundColor White
}

Write-Host ""
Write-Host "=== Diagnostic Complete ===" -ForegroundColor Cyan






