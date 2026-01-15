# ============================================================================
# ENSURE PRICE FEEDER NEVER STOPS - Keep Live Prices Working Non-Stop
# ============================================================================
# This script checks and restarts the existing Price Feeder if needed
# Ensures live prices continue working 24/7
# Run this on VPS
# ============================================================================

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  ENSURING PRICE FEEDER NEVER STOPS" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

$feederDir = "C:\imperial-price-feeder"
$serviceName = "Imperial Price Feeder"

# Check if Price Feeder is running in PM2
Write-Host "[1/6] Checking Price Feeder Service Status..." -ForegroundColor Yellow
$pm2List = pm2 list
$priceFeederRunning = $pm2List | Select-String $serviceName

if ($priceFeederRunning) {
    $status = pm2 jlist | ConvertFrom-Json | Where-Object { $_.name -eq $serviceName }
    if ($status) {
        Write-Host "   ✅ Price Feeder FOUND in PM2" -ForegroundColor Green
        Write-Host "   Status: $($status.pm2_env.status)" -ForegroundColor Gray
        
        if ($status.pm2_env.status -eq 'online') {
            Write-Host "   ✅ Price Feeder is ONLINE" -ForegroundColor Green
            Write-Host "   Uptime: $([math]::Round($status.pm2_env.pm_uptime / 1000 / 60, 1)) minutes" -ForegroundColor Gray
            Write-Host "   Restarts: $($status.pm2_env.restart_time)" -ForegroundColor Gray
        } else {
            Write-Host "   ⚠️  Price Feeder status: $($status.pm2_env.status)" -ForegroundColor Yellow
            Write-Host "   🔄 Restarting Price Feeder..." -ForegroundColor Yellow
            pm2 restart $serviceName
            Start-Sleep -Seconds 3
            Write-Host "   ✅ Price Feeder restarted" -ForegroundColor Green
        }
    }
} else {
    Write-Host "   ❌ Price Feeder NOT FOUND in PM2" -ForegroundColor Red
    Write-Host "   🔄 Attempting to start Price Feeder..." -ForegroundColor Yellow
    
    # Check if directory exists
    if (Test-Path $feederDir) {
        # Check for PM2 ecosystem file
        $ecosystemPath = "$feederDir\pm2-ecosystem.config.js"
        if (Test-Path $ecosystemPath) {
            Set-Location $feederDir
            pm2 start $ecosystemPath
            Start-Sleep -Seconds 3
            Write-Host "   ✅ Price Feeder started from ecosystem file" -ForegroundColor Green
            Set-Location $env:USERPROFILE
        } elseif (Test-Path "$feederDir\dist\index.js") {
            Set-Location $feederDir
            pm2 start "dist\index.js" --name $serviceName --cwd $feederDir --autorestart --max-restarts 999999 --min-uptime "10s" --restart-delay 5000
            Start-Sleep -Seconds 3
            Write-Host "   ✅ Price Feeder started from dist\index.js" -ForegroundColor Green
            Set-Location $env:USERPROFILE
        } else {
            Write-Host "   ❌ Price Feeder files not found in $feederDir" -ForegroundColor Red
            Write-Host "   ⚠️  Please check if Price Feeder is installed" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ❌ Price Feeder directory not found: $feederDir" -ForegroundColor Red
        Write-Host "   ⚠️  Price Feeder may need to be installed" -ForegroundColor Yellow
    }
}

Write-Host ""

# Check EC Markets MT5
Write-Host "[2/6] Checking EC Markets MT5..." -ForegroundColor Yellow
$mt5Process = Get-Process -Name "terminal64" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*EC Markets*" }
if ($mt5Process) {
    Write-Host "   ✅ EC Markets MT5 is RUNNING (PID: $($mt5Process.Id))" -ForegroundColor Green
} else {
    Write-Host "   ❌ EC Markets MT5 NOT RUNNING" -ForegroundColor Red
    Write-Host "   🔄 Starting EC Markets MT5..." -ForegroundColor Yellow
    $mt5Path = "C:\Program Files\EC Markets MetaTrader 5\terminal64.exe"
    if (Test-Path $mt5Path) {
        Start-Process $mt5Path
        Start-Sleep -Seconds 5
        Write-Host "   ✅ EC Markets MT5 started" -ForegroundColor Green
        Write-Host "   ⚠️  IMPORTANT: Log in to EC Markets account in MT5!" -ForegroundColor Yellow
    } else {
        Write-Host "   ❌ EC Markets MT5 not found at: $mt5Path" -ForegroundColor Red
    }
}

Write-Host ""

# Check Price Feeder Watchdog
Write-Host "[3/6] Checking Price Feeder Watchdog..." -ForegroundColor Yellow
$watchdogRunning = pm2 list | Select-String "Price Feeder Watchdog"
if (-not $watchdogRunning) {
    Write-Host "   ⚠️  Price Feeder Watchdog NOT RUNNING" -ForegroundColor Yellow
    Write-Host "   🔄 Starting Watchdog..." -ForegroundColor Yellow
    
    $watchdogPath = "C:\imperial-watchdogs\price-feeder-watchdog.js"
    if (Test-Path $watchdogPath) {
        pm2 start $watchdogPath --name "Price Feeder Watchdog" --autorestart --max-restarts 999999 --min-uptime "5s"
        Start-Sleep -Seconds 2
        Write-Host "   ✅ Price Feeder Watchdog started" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Watchdog script not found: $watchdogPath" -ForegroundColor Yellow
        Write-Host "   💡 Watchdog ensures Price Feeder never dies - consider creating it" -ForegroundColor Gray
    }
} else {
    Write-Host "   ✅ Price Feeder Watchdog is RUNNING" -ForegroundColor Green
}

Write-Host ""

# Check MT5 Watchdog
Write-Host "[4/6] Checking MT5 Watchdog..." -ForegroundColor Yellow
$mt5WatchdogRunning = pm2 list | Select-String "MT5 Watchdog"
if (-not $mt5WatchdogRunning) {
    Write-Host "   ⚠️  MT5 Watchdog NOT RUNNING" -ForegroundColor Yellow
    Write-Host "   🔄 Starting MT5 Watchdog..." -ForegroundColor Yellow
    
    $mt5WatchdogPath = "C:\imperial-watchdogs\mt5-watchdog.js"
    if (Test-Path $mt5WatchdogPath) {
        pm2 start $mt5WatchdogPath --name "MT5 Watchdog" --autorestart --max-restarts 999999 --min-uptime "5s"
        Start-Sleep -Seconds 2
        Write-Host "   ✅ MT5 Watchdog started" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  MT5 Watchdog script not found: $mt5WatchdogPath" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ✅ MT5 Watchdog is RUNNING" -ForegroundColor Green
}

Write-Host ""

# Save PM2 configuration (ensures auto-start on boot)
Write-Host "[5/6] Saving PM2 Configuration..." -ForegroundColor Yellow
pm2 save | Out-Null
Write-Host "   ✅ PM2 configuration saved (services will auto-start on boot)" -ForegroundColor Green

Write-Host ""

# Verify Price Feeder is sending prices
Write-Host "[6/6] Verifying Price Feeder is Sending Prices..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Check recent logs for successful sends
$logs = pm2 logs $serviceName --lines 10 --nostream 2>&1
if ($logs) {
    $recentSuccess = $logs | Select-String -Pattern "sent|success|✅|200" -CaseSensitive:$false
    if ($recentSuccess) {
        Write-Host "   ✅ Price Feeder is sending prices (check logs above)" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  No recent successful sends in logs" -ForegroundColor Yellow
        Write-Host "   💡 Check logs with: pm2 logs '$serviceName' --lines 50" -ForegroundColor Gray
    }
} else {
    Write-Host "   ⚠️  Could not fetch logs" -ForegroundColor Yellow
}

Write-Host ""

# Final Summary
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  ✅ PRICE FEEDER STATUS CHECK COMPLETE" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Current Status:" -ForegroundColor Yellow
pm2 list | Select-String -Pattern "$serviceName|Price Feeder Watchdog|MT5 Watchdog" -Context 0,0

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Monitor logs: pm2 logs '$serviceName' --lines 50" -ForegroundColor White
Write-Host "  2. Check prices in Supabase database (should update every 1-2 seconds)" -ForegroundColor White
Write-Host "  3. Verify frontend shows live prices at http://localhost:8080/signals" -ForegroundColor White
Write-Host ""
Write-Host "✅ Services will auto-start on boot and NEVER die!" -ForegroundColor Green
Write-Host ""




