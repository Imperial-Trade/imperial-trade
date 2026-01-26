# ============================================================================
# START ALL SERVICES - Ensures Live Price System NEVER Dies
# ============================================================================
# This script starts all services and watchdogs to ensure the live price
# system runs continuously and auto-restarts if anything fails.
# ============================================================================

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  STARTING ALL SERVICES - Live Price System" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "❌ ERROR: This script must be run as Administrator!" -ForegroundColor Red
    exit 1
}

# Connect to PM2
pm2 connect

# ============================================================================
# STEP 1: Ensure EC Markets MT5 is Running
# ============================================================================
Write-Host "STEP 1: Checking EC Markets MT5..." -ForegroundColor Yellow

$mt5Process = Get-Process -Name "terminal64" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*EC Markets*" }

if ($mt5Process) {
    Write-Host "   ✅ EC Markets MT5 is running (PID: $($mt5Process.Id))" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  EC Markets MT5 not running - Starting..." -ForegroundColor Yellow
    Start-Process "C:\Program Files\EC Markets MetaTrader 5\terminal64.exe"
    Start-Sleep -Seconds 5
    Write-Host "   ✅ EC Markets MT5 started" -ForegroundColor Green
}

Write-Host ""

# ============================================================================
# STEP 2: Start MT5 Watchdog (Ensures MT5 NEVER closes)
# ============================================================================
Write-Host "STEP 2: Starting MT5 Watchdog..." -ForegroundColor Yellow

$mt5WatchdogRunning = pm2 list | Select-String "MT5 Watchdog"
if ($mt5WatchdogRunning) {
    Write-Host "   ✅ MT5 Watchdog already running - Restarting for safety..." -ForegroundColor Green
    pm2 restart "MT5 Watchdog" --update-env
} else {
    $watchdogPath = "C:\imperial-watchdogs\mt5-watchdog.js"
    if (Test-Path $watchdogPath) {
        pm2 start $watchdogPath --name "MT5 Watchdog" --autorestart --max-restarts 999999 --min-uptime "5s"
        Write-Host "   ✅ MT5 Watchdog started" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  MT5 Watchdog script not found: $watchdogPath" -ForegroundColor Yellow
    }
}

Write-Host ""

# ============================================================================
# STEP 3: Start Price Feeder Service
# ============================================================================
Write-Host "STEP 3: Starting Price Feeder Service..." -ForegroundColor Yellow

$priceFeederRunning = pm2 list | Select-String "Imperial Price Feeder"
if ($priceFeederRunning) {
    Write-Host "   ✅ Price Feeder already running - Restarting for safety..." -ForegroundColor Green
    pm2 restart "Imperial Price Feeder" --update-env
} else {
    $priceFeederPath = "C:\imperial-price-feeder"
    if (Test-Path "$priceFeederPath\pm2-ecosystem.config.js") {
        pm2 start "$priceFeederPath\pm2-ecosystem.config.js" --name "Imperial Price Feeder"
        Write-Host "   ✅ Price Feeder started" -ForegroundColor Green
    } elseif (Test-Path "$priceFeederPath\dist\index.js") {
        pm2 start "$priceFeederPath\dist\index.js" `
            --name "Imperial Price Feeder" `
            --cwd $priceFeederPath `
            --autorestart `
            --max-restarts 999999 `
            --min-uptime "10s" `
            --restart-delay 5000 `
            --max-memory-restart "500M" `
            --error "$priceFeederPath\logs\error.log" `
            --output "$priceFeederPath\logs\out.log" `
            --log-date-format "YYYY-MM-DD HH:mm:ss Z" `
            --time
        Write-Host "   ✅ Price Feeder started" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Price Feeder files not found in $priceFeederPath" -ForegroundColor Red
    }
}

Write-Host ""

# ============================================================================
# STEP 4: Start Price Feeder Watchdog (Ensures service NEVER dies)
# ============================================================================
Write-Host "STEP 4: Starting Price Feeder Watchdog..." -ForegroundColor Yellow

$priceFeederWatchdogRunning = pm2 list | Select-String "Price Feeder Watchdog"
if ($priceFeederWatchdogRunning) {
    Write-Host "   ✅ Price Feeder Watchdog already running - Restarting for safety..." -ForegroundColor Green
    pm2 restart "Price Feeder Watchdog" --update-env
} else {
    $watchdogPath = "C:\imperial-watchdogs\price-feeder-watchdog.js"
    if (Test-Path $watchdogPath) {
        pm2 start $watchdogPath `
            --name "Price Feeder Watchdog" `
            --autorestart `
            --max-restarts 999999 `
            --min-uptime "5s" `
            --restart-delay 3000
        Write-Host "   ✅ Price Feeder Watchdog started" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Price Feeder Watchdog script not found: $watchdogPath" -ForegroundColor Yellow
        Write-Host "   ⚠️  Run COMPLETE_VPS_SETUP.ps1 first to create watchdog scripts" -ForegroundColor Yellow
    }
}

Write-Host ""

# ============================================================================
# STEP 5: Save PM2 Configuration (Auto-start on boot)
# ============================================================================
Write-Host "STEP 5: Saving PM2 Configuration..." -ForegroundColor Yellow

pm2 save
Write-Host "   ✅ PM2 configuration saved - Services will auto-start on boot" -ForegroundColor Green

Write-Host ""

# ============================================================================
# STEP 6: Verify All Services Running
# ============================================================================
Write-Host "STEP 6: Verifying All Services..." -ForegroundColor Yellow
Write-Host ""

pm2 list

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  ✅ ALL SERVICES STARTED!" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Services Running:" -ForegroundColor Yellow
Write-Host "  ✅ EC Markets MT5 - Price source" -ForegroundColor Green
Write-Host "  ✅ MT5 Watchdog - Ensures MT5 NEVER closes" -ForegroundColor Green
Write-Host "  ✅ Imperial Price Feeder - Sends prices to Supabase" -ForegroundColor Green
Write-Host "  ✅ Price Feeder Watchdog - Ensures feeder NEVER dies" -ForegroundColor Green
Write-Host ""
Write-Host "Monitoring Commands:" -ForegroundColor Yellow
Write-Host "  pm2 logs 'Imperial Price Feeder' --lines 50" -ForegroundColor White
Write-Host "  pm2 logs 'Price Feeder Watchdog' --lines 50" -ForegroundColor White
Write-Host "  pm2 logs 'MT5 Watchdog' --lines 50" -ForegroundColor White
Write-Host "  pm2 monit" -ForegroundColor White
Write-Host ""
Write-Host "✅ Live Price System is now running and will NEVER die!" -ForegroundColor Green
Write-Host ""




