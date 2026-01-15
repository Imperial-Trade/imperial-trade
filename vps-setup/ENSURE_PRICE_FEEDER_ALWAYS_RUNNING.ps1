# PowerShell script to ensure Imperial Price Feeder always runs
# This script should be run on VPS startup or scheduled to run periodically

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  🔒 ENSURING IMPERIAL PRICE FEEDER ALWAYS RUNS" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Check if PM2 is installed
$pm2Installed = Get-Command pm2 -ErrorAction SilentlyContinue
if (-not $pm2Installed) {
    Write-Host "❌ PM2 is not installed or not in PATH!" -ForegroundColor Red
    Write-Host "   Please install PM2: npm install -g pm2" -ForegroundColor Yellow
    exit 1
}

# Check PM2 status
Write-Host "📊 Checking PM2 status..." -ForegroundColor Yellow
$pm2Status = pm2 status --no-color 2>&1

# Check if Price Feeder is running
$priceFeederRunning = $pm2Status -match "Imperial Price Feeder.*online"

if (-not $priceFeederRunning) {
    Write-Host "⚠️  Imperial Price Feeder is NOT running!" -ForegroundColor Yellow
    Write-Host "   Starting Price Feeder..." -ForegroundColor Yellow
    
    # Start Price Feeder
    pm2 start C:\imperial-price-feeder\dist\index.js --name "Imperial Price Feeder" --update-env
    
    # Wait a moment
    Start-Sleep -Seconds 3
    
    # Check again
    $pm2Status = pm2 status --no-color 2>&1
    $priceFeederRunning = $pm2Status -match "Imperial Price Feeder.*online"
    
    if ($priceFeederRunning) {
        Write-Host "✅ Imperial Price Feeder started successfully!" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to start Imperial Price Feeder!" -ForegroundColor Red
        Write-Host "   Check logs: pm2 logs \"Imperial Price Feeder\" --err" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "✅ Imperial Price Feeder is already running" -ForegroundColor Green
}

# Configure PM2 for auto-restart
Write-Host ""
Write-Host "🔧 Configuring PM2 for auto-restart..." -ForegroundColor Yellow

# Set max restarts (unlimited)
pm2 set "Imperial Price Feeder" max_restarts 999999

# Set restart delay
pm2 set "Imperial Price Feeder" min_uptime 1000

# Set exponential backoff
pm2 set "Imperial Price Feeder" exp_backoff_restart_delay 100

# Save PM2 configuration
pm2 save

Write-Host "✅ PM2 auto-restart configured" -ForegroundColor Green

# Check if PM2 startup is configured
Write-Host ""
Write-Host "🔧 Checking PM2 startup configuration..." -ForegroundColor Yellow

$startupConfigured = pm2 startup 2>&1
if ($startupConfigured -match "already") {
    Write-Host "✅ PM2 startup is already configured" -ForegroundColor Green
} else {
    Write-Host "⚠️  PM2 startup needs to be configured" -ForegroundColor Yellow
    Write-Host "   Run the command shown above as Administrator" -ForegroundColor Yellow
}

# Verify Price Feeder is running
Write-Host ""
Write-Host "📊 Final Status:" -ForegroundColor Yellow
pm2 status

# Check Price Feeder logs for errors
Write-Host ""
Write-Host "📋 Checking Price Feeder logs (last 5 lines)..." -ForegroundColor Yellow
$logs = pm2 logs "Imperial Price Feeder" --lines 5 --nostream --raw 2>&1 | Select-Object -Last 5
$logs | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }

# Check for errors
$errorLogs = pm2 logs "Imperial Price Feeder" --err --lines 5 --nostream --raw 2>&1 | Select-Object -Last 5
if ($errorLogs -match "error|Error|ERROR|failed|Failed|FAILED") {
    Write-Host ""
    Write-Host "⚠️  Errors found in Price Feeder logs:" -ForegroundColor Yellow
    $errorLogs | ForEach-Object { Write-Host "   $_" -ForegroundColor Red }
} else {
    Write-Host "✅ No errors in Price Feeder logs" -ForegroundColor Green
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  ✅ PRICE FEEDER PROTECTION COMPLETE" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
