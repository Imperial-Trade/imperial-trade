# Check MT5 Status and Kill Ghost Processes
# Run this script to diagnose MT5 connection issues

Write-Host "=== MT5 STATUS CHECK ===" -ForegroundColor Cyan
Write-Host ""

# 1. Check for MT5 processes
Write-Host "1. Checking for MT5 processes..." -ForegroundColor Yellow
$mt5Processes = Get-Process | Where-Object { $_.ProcessName -like '*terminal*' -or $_.ProcessName -like '*mt5*' }
if ($mt5Processes) {
    Write-Host "   Found MT5 processes:" -ForegroundColor Green
    $mt5Processes | Format-Table ProcessName, Id, StartTime, Path -AutoSize
} else {
    Write-Host "   No MT5 processes found" -ForegroundColor Red
}

Write-Host ""

# 2. Check if Generic MT5 path exists
Write-Host "2. Checking Generic MT5 installation..." -ForegroundColor Yellow
$mt5Path = "C:\Program Files\MetaTrader 5\terminal64.exe"
if (Test-Path $mt5Path) {
    Write-Host "   ✅ Generic MT5 found at: $mt5Path" -ForegroundColor Green
} else {
    Write-Host "   ❌ Generic MT5 NOT FOUND at: $mt5Path" -ForegroundColor Red
}

Write-Host ""

# 3. Check for Python processes
Write-Host "3. Checking for Python processes..." -ForegroundColor Yellow
$pythonProcesses = Get-Process | Where-Object { $_.ProcessName -like '*python*' }
if ($pythonProcesses) {
    Write-Host "   Found Python processes:" -ForegroundColor Green
    $pythonProcesses | Format-Table ProcessName, Id, StartTime -AutoSize
} else {
    Write-Host "   No Python processes found" -ForegroundColor Gray
}

Write-Host ""

# 4. Ask if user wants to kill ghost processes
if ($mt5Processes) {
    Write-Host "4. Do you want to kill all MT5 processes? (Y/N)" -ForegroundColor Yellow
    $response = Read-Host
    if ($response -eq 'Y' -or $response -eq 'y') {
        Write-Host "   Killing MT5 processes..." -ForegroundColor Yellow
        $mt5Processes | ForEach-Object {
            try {
                Stop-Process -Id $_.Id -Force
                Write-Host "   ✅ Killed process: $($_.ProcessName) (ID: $($_.Id))" -ForegroundColor Green
            } catch {
                Write-Host "   ❌ Failed to kill process: $($_.ProcessName) (ID: $($_.Id))" -ForegroundColor Red
            }
        }
        Write-Host "   ✅ All MT5 processes killed. Please restart MT5 manually." -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "=== RECOMMENDATIONS ===" -ForegroundColor Cyan
Write-Host "1. Ensure Generic MT5 is running and logged in manually" -ForegroundColor White
Write-Host "2. Close all popup windows in MT5" -ForegroundColor White
Write-Host "3. Check MT5 Journal tab for connection errors" -ForegroundColor White
Write-Host "4. Run Python scripts as Administrator" -ForegroundColor White
Write-Host "5. Verify server name matches exactly (case-sensitive)" -ForegroundColor White
Write-Host ""


