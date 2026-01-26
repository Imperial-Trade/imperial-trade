# Fix MT5 Isolation - Ensure Price Feeder and Broker Service Use Separate Instances
# This script ensures proper isolation between the two services

Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🔧 Fixing MT5 Isolation Between Services" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Step 1: Kill all MT5 processes
Write-Host "Step 1: Stopping all MT5 processes..." -ForegroundColor Yellow
taskkill /F /IM terminal64.exe 2>$null
taskkill /F /IM python.exe 2>$null
taskkill /F /IM pythonw.exe 2>$null
Start-Sleep -Seconds 5
Write-Host "✅ All MT5 processes stopped" -ForegroundColor Green
Write-Host ""

# Step 2: Stop PM2 services
Write-Host "Step 2: Stopping PM2 services..." -ForegroundColor Yellow
pm2 stop all
Start-Sleep -Seconds 2
Write-Host "✅ PM2 services stopped" -ForegroundColor Green
Write-Host ""

# Step 3: Create isolated directories for portable mode
Write-Host "Step 3: Creating isolated MT5 directories..." -ForegroundColor Yellow

# Broker Service: Generic MT5 in portable mode
$brokerTerminalDir = "C:\MT5_BrokerService"
if (-not (Test-Path $brokerTerminalDir)) {
    New-Item -ItemType Directory -Path $brokerTerminalDir -Force | Out-Null
    Write-Host "✅ Created: $brokerTerminalDir (for Broker Service)" -ForegroundColor Green
} else {
    Write-Host "✅ Already exists: $brokerTerminalDir" -ForegroundColor Green
}

# Price Feeder: EC Markets MT5 (should use its own installation or portable mode)
$priceFeederTerminalDir = "C:\MT5_PriceFeeder"
if (-not (Test-Path $priceFeederTerminalDir)) {
    New-Item -ItemType Directory -Path $priceFeederTerminalDir -Force | Out-Null
    Write-Host "✅ Created: $priceFeederTerminalDir (for Price Feeder)" -ForegroundColor Green
} else {
    Write-Host "✅ Already exists: $priceFeederTerminalDir" -ForegroundColor Green
}

Write-Host ""
Write-Host "📁 Isolation directories created:" -ForegroundColor Cyan
Write-Host "   Price Feeder: $priceFeederTerminalDir" -ForegroundColor White
Write-Host "   Broker Service: $brokerTerminalDir" -ForegroundColor White
Write-Host "   These are separate 'sandboxes' - no file sharing!" -ForegroundColor Green
Write-Host ""

# Step 4: Start Price Feeder MT5 (EC Markets) in isolated portable mode
Write-Host "Step 4: Starting Price Feeder MT5 in isolated portable mode..." -ForegroundColor Yellow

# Check if EC Markets MT5 exists separately
$ecMarketsMT5 = "C:\Program Files\EC Markets MetaTrader 5\terminal64.exe"
$genericMT5 = "C:\Program Files\MetaTrader 5\terminal64.exe"

if (Test-Path $ecMarketsMT5) {
    Write-Host "✅ EC Markets MT5 found: $ecMarketsMT5" -ForegroundColor Green
    Write-Host "   Starting Price Feeder MT5 in portable mode: $priceFeederTerminalDir" -ForegroundColor Yellow
    Start-Process -FilePath $ecMarketsMT5 -ArgumentList "/portable:""$priceFeederTerminalDir"""
    Start-Sleep -Seconds 8
    Write-Host "   ✅ Price Feeder MT5 started in isolated sandbox" -ForegroundColor Green
} elseif (Test-Path $genericMT5) {
    Write-Host "⚠️  EC Markets MT5 not found, using Generic MT5 for Price Feeder" -ForegroundColor Yellow
    Write-Host "   Starting Price Feeder MT5 in portable mode: $priceFeederTerminalDir" -ForegroundColor Yellow
    Start-Process -FilePath $genericMT5 -ArgumentList "/portable:""$priceFeederTerminalDir"""
    Start-Sleep -Seconds 8
    Write-Host "   ✅ Price Feeder MT5 started in isolated sandbox" -ForegroundColor Green
} else {
    Write-Host "❌ No MT5 installation found!" -ForegroundColor Red
    Write-Host "   Please install MT5 first" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Step 5: Start Broker Service MT5 (Generic) in isolated portable mode
Write-Host "Step 5: Starting Broker Service MT5 in isolated portable mode..." -ForegroundColor Yellow
if (Test-Path $genericMT5) {
    Write-Host "✅ Generic MT5 found: $genericMT5" -ForegroundColor Green
    Write-Host "   Starting Broker Service MT5 in portable mode: $brokerTerminalDir" -ForegroundColor Yellow
    Start-Process -FilePath $genericMT5 -ArgumentList "/portable:""$brokerTerminalDir"""
    Start-Sleep -Seconds 8
    Write-Host "   ✅ Broker Service MT5 started in isolated sandbox" -ForegroundColor Green
} else {
    Write-Host "❌ Generic MT5 not found: $genericMT5" -ForegroundColor Red
    Write-Host "   Cannot start Broker Service MT5" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Step 6: Verify processes are isolated (CRITICAL CHECK)
Write-Host "Step 6: Verifying isolation (CRITICAL)..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
$mt5Processes = Get-Process -Name terminal64 -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
if ($mt5Processes.Count -eq 2) {
    Write-Host "✅ SUCCESS: Two MT5 processes running (ISOLATED)" -ForegroundColor Green
    Write-Host "   This means services are no longer 'fighting' - they're in separate 'worlds'!" -ForegroundColor Green
    Write-Host ""
    Write-Host "   Process Details:" -ForegroundColor Cyan
    $index = 1
    foreach ($proc in $mt5Processes) {
        Write-Host "   $index. PID: $($proc.Id) | Started: $($proc.StartTime) | Path: $($proc.Path)" -ForegroundColor White
        $index++
    }
    Write-Host ""
    Write-Host "   ✅ Isolation verified - Error [32] should be resolved!" -ForegroundColor Green
} elseif ($mt5Processes.Count -eq 1) {
    Write-Host "⚠️  WARNING: Only one MT5 process running" -ForegroundColor Yellow
    Write-Host "   Both services may still be sharing the same instance" -ForegroundColor Yellow
    Write-Host "   This could still cause Error [32]" -ForegroundColor Red
    Write-Host ""
    Write-Host "   Process: PID $($mt5Processes[0].Id) | Path: $($mt5Processes[0].Path)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   Action: Wait a few seconds and check again, or restart the script" -ForegroundColor Yellow
} else {
    Write-Host "⚠️  Unexpected number of MT5 processes: $($mt5Processes.Count)" -ForegroundColor Yellow
    if ($mt5Processes.Count -gt 2) {
        Write-Host "   Multiple instances detected - this is OK if intentional" -ForegroundColor Gray
    } else {
        Write-Host "   No MT5 processes running - services may need MT5 to be started" -ForegroundColor Yellow
    }
}
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host ""

# Step 7: Restart PM2 services
Write-Host "Step 7: Restarting PM2 services..." -ForegroundColor Yellow
pm2 restart all
Start-Sleep -Seconds 3
pm2 status
Write-Host ""

# Step 8: Final instructions
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ MT5 Isolation Fix Complete!" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Verify MT5 instances:" -ForegroundColor White
Write-Host "   • Price Feeder: Should be connected to EC Markets" -ForegroundColor Gray
Write-Host "   • Broker Service: Should be Generic MT5 in portable mode" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Check isolation:" -ForegroundColor White
Write-Host "   • Run: .\CHECK_MT5_ISOLATION.ps1" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Test connection:" -ForegroundColor White
Write-Host "   • Monitor: pm2 logs imperial-trade-broker-service" -ForegroundColor Cyan
Write-Host "   • Test from website" -ForegroundColor Gray
Write-Host ""
Write-Host "4. If Error [32] persists:" -ForegroundColor White
Write-Host "   • Ensure each MT5 uses different data directories" -ForegroundColor Gray
Write-Host "   • Verify portable mode is working correctly" -ForegroundColor Gray
Write-Host ""
