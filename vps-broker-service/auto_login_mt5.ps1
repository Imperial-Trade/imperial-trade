# Auto-Login Script for Generic MT5
# This script starts Generic MT5 and logs in automatically
# Run this ONCE via Remote Desktop to activate MT5 for Python connections

$mt5Path = "C:\Program Files\MetaTrader 5\terminal64.exe"
$login = "800107112"
$password = "Demo@123"
$server = "ECMarkets-MT5-Demo"

Write-Host "Starting Generic MT5..."
Start-Process -FilePath $mt5Path -WindowStyle Normal

# Wait for MT5 to fully load (can take 10-30 seconds)
Write-Host "Waiting for MT5 to load..."
Start-Sleep -Seconds 15

# Note: MT5 doesn't support command-line auto-login
# You need to manually log in the first time:
Write-Host ""
Write-Host "=========================================="
Write-Host "MANUAL LOGIN REQUIRED:"
Write-Host "=========================================="
Write-Host "1. In the MT5 window that opened:"
Write-Host "   - Go to: File → Login to Trade Account"
Write-Host "   - Login: $login"
Write-Host "   - Password: $password"
Write-Host "   - Server: $server"
Write-Host "   - Click Login"
Write-Host ""
Write-Host "2. Wait for connection (green bars in bottom right)"
Write-Host ""
Write-Host "3. DO NOT close MT5 terminal - keep it open"
Write-Host "   (Minimize it if needed)"
Write-Host ""
Write-Host "4. After login, Python connections will work"
Write-Host "=========================================="
Write-Host ""

# Check if MT5 is running
$mt5Process = Get-Process -Name terminal64 -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $mt5Path }
if ($mt5Process) {
    Write-Host "✅ Generic MT5 is running (PID: $($mt5Process.Id))"
    Write-Host "⚠️  Please complete manual login in the MT5 window"
} else {
    Write-Host "❌ Generic MT5 failed to start"
}









