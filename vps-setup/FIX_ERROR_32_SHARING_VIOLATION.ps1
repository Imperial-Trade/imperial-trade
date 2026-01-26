# Fix Error [32] - Sharing Violation
# Kills all MT5 and Python processes, then starts MT5 in pure portable mode

Write-Host "🔧 Fixing Error [32] - Sharing Violation..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Kill all ghost processes
Write-Host "Step 1: Killing all MT5 and Python processes..." -ForegroundColor Yellow
taskkill /F /IM terminal64.exe 2>$null
taskkill /F /IM python.exe 2>$null
taskkill /F /IM pythonw.exe 2>$null

Write-Host "✅ All MT5 and Python processes killed" -ForegroundColor Green
Write-Host "   Waiting 5 seconds for processes to fully terminate..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Step 2: Verify processes are killed
Write-Host ""
Write-Host "Step 2: Verifying processes are terminated..." -ForegroundColor Yellow
$mt5Processes = Get-Process -Name terminal64 -ErrorAction SilentlyContinue
$pythonProcesses = Get-Process -Name python,pythonw -ErrorAction SilentlyContinue

if ($mt5Processes) {
    Write-Host "⚠️  Warning: Some MT5 processes still running:" -ForegroundColor Red
    $mt5Processes | ForEach-Object { Write-Host "   PID: $($_.Id) - $($_.ProcessName)" -ForegroundColor Red }
    Write-Host "   Attempting force kill again..." -ForegroundColor Yellow
    $mt5Processes | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

if ($pythonProcesses) {
    Write-Host "⚠️  Warning: Some Python processes still running:" -ForegroundColor Red
    $pythonProcesses | ForEach-Object { Write-Host "   PID: $($_.Id) - $($_.ProcessName)" -ForegroundColor Red }
    Write-Host "   Attempting force kill again..." -ForegroundColor Yellow
    $pythonProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

if (-not $mt5Processes -and -not $pythonProcesses) {
    Write-Host "✅ All processes terminated successfully" -ForegroundColor Green
}

# Step 3: Start MT5 in pure portable mode
Write-Host ""
Write-Host "Step 3: Starting MT5 in pure portable mode..." -ForegroundColor Yellow
$mt5Path = "C:\Program Files\MetaTrader 5\terminal64.exe"

if (Test-Path $mt5Path) {
    Write-Host "   MT5 path found: $mt5Path" -ForegroundColor White
    Write-Host "   Starting with /portable flag..." -ForegroundColor White
    
    # Start MT5 in portable mode (isolated folder)
    Start-Process -FilePath $mt5Path -ArgumentList "/portable"
    
    Write-Host "✅ MT5 started in portable mode" -ForegroundColor Green
    Write-Host "   Please wait for MT5 to fully load..." -ForegroundColor Yellow
    Write-Host "   Check that bottom-right shows 'Authorized' and bars are green/blue" -ForegroundColor Yellow
    Start-Sleep -Seconds 10
} else {
    Write-Host "❌ MT5 not found at: $mt5Path" -ForegroundColor Red
    Write-Host "   Please check the MT5 installation path" -ForegroundColor Yellow
    exit 1
}

# Step 4: Verify MT5 is running
Write-Host ""
Write-Host "Step 4: Verifying MT5 is running..." -ForegroundColor Yellow
$mt5Running = Get-Process -Name terminal64 -ErrorAction SilentlyContinue
if ($mt5Running) {
    Write-Host "✅ MT5 is running (PID: $($mt5Running.Id))" -ForegroundColor Green
} else {
    Write-Host "⚠️  MT5 process not found - it may still be starting" -ForegroundColor Yellow
}

# Step 5: Check broker service status
Write-Host ""
Write-Host "Step 5: Checking broker service status..." -ForegroundColor Yellow
pm2 status imperial-trade-broker-service

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ Error [32] Fix Complete!" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. In MT5: Verify connection bars are green/blue (bottom-right)" -ForegroundColor White
Write-Host "2. In MT5: Go to Symbols tab → Right-click EURUSD → Hide All → Show All" -ForegroundColor White
Write-Host "3. On VPS: Run 'pm2 logs imperial-trade-broker-service' to monitor logs" -ForegroundColor White
Write-Host "4. On Website: Click 'Connect Broker' and watch VPS logs" -ForegroundColor White
Write-Host ""
Write-Host "Expected in logs:" -ForegroundColor Cyan
Write-Host "  ✅ 'MT5 initialized successfully' = Working!" -ForegroundColor Green
Write-Host "  ❌ 'IPC timeout' or 'Wait for sync failed' = Still has Error [32]" -ForegroundColor Red
Write-Host ""
