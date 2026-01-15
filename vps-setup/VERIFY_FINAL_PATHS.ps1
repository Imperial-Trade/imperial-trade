# Verify All Paths Match Final Structure
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🔍 VERIFYING FINAL PATH STRUCTURE" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Expected Final Structure
$expectedPaths = @{
    "Broker Service" = "C:\vps-broker-service\"
    "Price Feeder" = "C:\imperial-price-feeder\"
    "MT5 Broker" = "C:\MT5_BrokerService\"
    "MT5 Price Feeder" = "C:\Program Files\MetaTrader 5\"
}

Write-Host "EXPECTED STRUCTURE:" -ForegroundColor Yellow
Write-Host "────────────────────────────────────────────────────────────" -ForegroundColor Gray
foreach ($service in $expectedPaths.Keys) {
    $path = $expectedPaths[$service]
    if (Test-Path $path) {
        Write-Host "  ✅ $service" -ForegroundColor Green
        Write-Host "     Path: $path" -ForegroundColor Gray
    } else {
        Write-Host "  ❌ $service" -ForegroundColor Red
        Write-Host "     Path: $path (NOT FOUND)" -ForegroundColor Red
    }
}
Write-Host ""

# Verify Python Scripts
Write-Host "VERIFYING PYTHON SCRIPTS:" -ForegroundColor Yellow
Write-Host "────────────────────────────────────────────────────────────" -ForegroundColor Gray
$pythonScripts = @(
    "C:\vps-broker-service\python\test_connection.py",
    "C:\vps-broker-service\python\fetch_trades.py",
    "C:\vps-broker-service\python\get_servers.py"
)

foreach ($script in $pythonScripts) {
    if (Test-Path $script) {
        $content = Get-Content $script -Raw
        if ($content -match "C:\\MT5_BrokerService\\terminal64.exe") {
            Write-Host "  ✅ $(Split-Path $script -Leaf) - Correct path" -ForegroundColor Green
        } elseif ($content -match "C:\\Program Files\\MetaTrader 5\\terminal64.exe") {
            Write-Host "  ❌ $(Split-Path $script -Leaf) - OLD PATH FOUND!" -ForegroundColor Red
        } else {
            Write-Host "  ⚠️  $(Split-Path $script -Leaf) - No path found" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  ❌ $(Split-Path $script -Leaf) - FILE NOT FOUND" -ForegroundColor Red
    }
}
Write-Host ""

# Verify Watchdog Path
Write-Host "VERIFYING WATCHDOG:" -ForegroundColor Yellow
Write-Host "────────────────────────────────────────────────────────────" -ForegroundColor Gray
$watchdogPath = "C:\imperial-price-feeder\watchdogs\price-feeder-watchdog.js"
if (Test-Path $watchdogPath) {
    Write-Host "  ✅ Watchdog exists at correct location" -ForegroundColor Green
    Write-Host "     Path: $watchdogPath" -ForegroundColor Gray
} else {
    Write-Host "  ❌ Watchdog NOT FOUND" -ForegroundColor Red
    Write-Host "     Expected: $watchdogPath" -ForegroundColor Red
}
Write-Host ""

# Verify MT5 Processes
Write-Host "VERIFYING MT5 PROCESSES:" -ForegroundColor Yellow
Write-Host "────────────────────────────────────────────────────────────" -ForegroundColor Gray
$mt5Processes = Get-Process -Name terminal64 -ErrorAction SilentlyContinue
if ($mt5Processes) {
    foreach ($proc in $mt5Processes) {
        $path = $proc.Path
        if ($path -like "*MT5_BrokerService*") {
            Write-Host "  ✅ MT5 Broker Service - RUNNING" -ForegroundColor Green
            Write-Host "     Path: $path" -ForegroundColor Gray
        } elseif ($path -like "*Program Files*MetaTrader 5*") {
            Write-Host "  ✅ MT5 Price Feeder - RUNNING" -ForegroundColor Green
            Write-Host "     Path: $path" -ForegroundColor Gray
        } else {
            Write-Host "  ⚠️  Unknown MT5 Instance" -ForegroundColor Yellow
            Write-Host "     Path: $path" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "  ❌ No MT5 processes found" -ForegroundColor Red
}
Write-Host ""

# Verify PM2 Services
Write-Host "VERIFYING PM2 SERVICES:" -ForegroundColor Yellow
Write-Host "────────────────────────────────────────────────────────────" -ForegroundColor Gray
$pm2Status = pm2 status 2>&1
if ($pm2Status -match "imperial-trade-broker-service|Imperial Price Feeder") {
    Write-Host "  ✅ PM2 Services found" -ForegroundColor Green
    pm2 status
} else {
    Write-Host "  ⚠️  PM2 services not found or not running" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ VERIFICATION COMPLETE" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
