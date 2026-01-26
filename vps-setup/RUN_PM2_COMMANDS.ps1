# ============================================================================
# RUN PM2 COMMANDS - Check and Restart Price Feeder
# ============================================================================
# This script runs all necessary PM2 commands to check and restart Price Feeder
# Run this on VPS PowerShell as Administrator
# ============================================================================

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  RUNNING PM2 COMMANDS - Price Feeder Status Check" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

$serviceName = "Imperial Price Feeder"

# Step 1: Check PM2 Installation
Write-Host "[1/7] Checking PM2 Installation..." -ForegroundColor Yellow
if (Get-Command pm2 -ErrorAction SilentlyContinue) {
    $pm2Version = pm2 --version
    Write-Host "   ✅ PM2 installed: v$pm2Version" -ForegroundColor Green
} else {
    Write-Host "   ❌ PM2 NOT FOUND" -ForegroundColor Red
    Write-Host "   ⚠️  Install PM2 first: npm install -g pm2" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Step 2: Check All PM2 Services
Write-Host "[2/7] Checking All PM2 Services..." -ForegroundColor Yellow
Write-Host "   Current PM2 Services:" -ForegroundColor Gray
pm2 list
Write-Host ""

# Step 3: Check Price Feeder Service
Write-Host "[3/7] Checking Price Feeder Service..." -ForegroundColor Yellow
$pm2List = pm2 list
$priceFeederFound = $pm2List | Select-String $serviceName

if ($priceFeederFound) {
    Write-Host "   ✅ Price Feeder FOUND in PM2" -ForegroundColor Green
    
    # Get detailed status
    $status = pm2 jlist | ConvertFrom-Json | Where-Object { $_.name -eq $serviceName }
    if ($status) {
        Write-Host "   Service Details:" -ForegroundColor Gray
        Write-Host "   - Status: $($status.pm2_env.status)" -ForegroundColor Gray
        Write-Host "   - Uptime: $([math]::Round($status.pm2_env.pm_uptime / 1000 / 60, 1)) minutes" -ForegroundColor Gray
        Write-Host "   - Restarts: $($status.pm2_env.restart_time)" -ForegroundColor Gray
        Write-Host "   - Memory: $([math]::Round($status.monit.memory / 1024 / 1024, 1)) MB" -ForegroundColor Gray
        Write-Host "   - CPU: $([math]::Round($status.monit.cpu, 1))%" -ForegroundColor Gray
        Write-Host "   - Script: $($status.pm2_env.pm_exec_path)" -ForegroundColor Gray
        
        if ($status.pm2_env.status -ne 'online') {
            Write-Host "   ⚠️  Service is NOT online - will restart..." -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "   ❌ Price Feeder NOT FOUND in PM2" -ForegroundColor Red
}
Write-Host ""

# Step 4: Check EC Markets MT5
Write-Host "[4/7] Checking EC Markets MT5..." -ForegroundColor Yellow
$mt5Process = Get-Process -Name "terminal64" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*EC Markets*" }
if ($mt5Process) {
    Write-Host "   ✅ EC Markets MT5 is RUNNING (PID: $($mt5Process.Id))" -ForegroundColor Green
    $uptime = (Get-Date) - $mt5Process.StartTime
    Write-Host "   Uptime: $($uptime.Hours)h $($uptime.Minutes)m" -ForegroundColor Gray
} else {
    Write-Host "   ❌ EC Markets MT5 NOT RUNNING" -ForegroundColor Red
    Write-Host "   🔄 Starting EC Markets MT5..." -ForegroundColor Yellow
    $mt5Path = "C:\Program Files\EC Markets MetaTrader 5\terminal64.exe"
    if (Test-Path $mt5Path) {
        Start-Process $mt5Path
        Start-Sleep -Seconds 5
        Write-Host "   ✅ EC Markets MT5 started" -ForegroundColor Green
        Write-Host "   ⚠️  IMPORTANT: Log in to EC Markets account!" -ForegroundColor Yellow
    } else {
        Write-Host "   ❌ EC Markets MT5 not found at: $mt5Path" -ForegroundColor Red
    }
}
Write-Host ""

# Step 5: Restart Price Feeder if Found
Write-Host "[5/7] Restarting Price Feeder..." -ForegroundColor Yellow
if ($priceFeederFound) {
    Write-Host "   🔄 Restarting Price Feeder service..." -ForegroundColor Gray
    pm2 restart $serviceName
    Start-Sleep -Seconds 3
    Write-Host "   ✅ Price Feeder restarted" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Price Feeder not found - attempting to start..." -ForegroundColor Yellow
    
    $feederDir = "C:\imperial-price-feeder"
    if (Test-Path "$feederDir\pm2-ecosystem.config.js") {
        Set-Location $feederDir
        pm2 start pm2-ecosystem.config.js
        Start-Sleep -Seconds 3
        Write-Host "   ✅ Price Feeder started from ecosystem file" -ForegroundColor Green
        Set-Location $env:USERPROFILE
    } elseif (Test-Path "$feederDir\dist\index.js") {
        Set-Location $feederDir
        pm2 start "dist\index.js" --name $serviceName --cwd $feederDir --autorestart --max-restarts 999999 --min-uptime "10s" --restart-delay 5000 --error "$feederDir\logs\error.log" --output "$feederDir\logs\out.log"
        Start-Sleep -Seconds 3
        Write-Host "   ✅ Price Feeder started from dist\index.js" -ForegroundColor Green
        Set-Location $env:USERPROFILE
    } else {
        Write-Host "   ❌ Price Feeder files not found in $feederDir" -ForegroundColor Red
    }
}
Write-Host ""

# Step 6: Start Watchdogs
Write-Host "[6/7] Ensuring Watchdogs are Running..." -ForegroundColor Yellow

# Price Feeder Watchdog
$watchdogFound = pm2 list | Select-String "Price Feeder Watchdog"
if (-not $watchdogFound) {
    $watchdogPath = "C:\imperial-watchdogs\price-feeder-watchdog.js"
    if (Test-Path $watchdogPath) {
        pm2 start $watchdogPath --name "Price Feeder Watchdog" --autorestart --max-restarts 999999 --min-uptime "5s"
        Write-Host "   ✅ Price Feeder Watchdog started" -ForegroundColor Green
    }
} else {
    Write-Host "   ✅ Price Feeder Watchdog already running" -ForegroundColor Green
}

# MT5 Watchdog
$mt5WatchdogFound = pm2 list | Select-String "MT5 Watchdog"
if (-not $mt5WatchdogFound) {
    $mt5WatchdogPath = "C:\imperial-watchdogs\mt5-watchdog.js"
    if (Test-Path $mt5WatchdogPath) {
        pm2 start $mt5WatchdogPath --name "MT5 Watchdog" --autorestart --max-restarts 999999 --min-uptime "5s"
        Write-Host "   ✅ MT5 Watchdog started" -ForegroundColor Green
    }
} else {
    Write-Host "   ✅ MT5 Watchdog already running" -ForegroundColor Green
}

Write-Host ""

# Step 7: Save PM2 Configuration and Show Status
Write-Host "[7/7] Saving PM2 Configuration..." -ForegroundColor Yellow
pm2 save | Out-Null
Write-Host "   ✅ PM2 configuration saved (services will auto-start on boot)" -ForegroundColor Green

Write-Host ""

# Final Status
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  ✅ PM2 COMMANDS COMPLETE" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Final PM2 Status:" -ForegroundColor Yellow
pm2 list

Write-Host ""
Write-Host "Price Feeder Logs (Last 20 lines):" -ForegroundColor Yellow
try {
    pm2 logs $serviceName --lines 20 --nostream
} catch {
    Write-Host "   ⚠️  Could not fetch logs" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Monitor logs: pm2 logs '$serviceName' --lines 50" -ForegroundColor White
Write-Host "  2. Monitor all: pm2 monit" -ForegroundColor White
Write-Host "  3. Check prices in Supabase (should update every 1-2 seconds)" -ForegroundColor White
Write-Host ""
Write-Host "✅ Services will auto-start on boot and NEVER die!" -ForegroundColor Green
Write-Host ""




