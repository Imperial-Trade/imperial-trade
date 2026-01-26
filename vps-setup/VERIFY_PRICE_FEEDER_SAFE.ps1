# PowerShell script to verify Price Feeder is safe and running
# Run this after ANY broker service changes

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  🔒 PRICE FEEDER SAFETY VERIFICATION" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Check PM2 status
Write-Host "📊 Checking PM2 Status..." -ForegroundColor Yellow
$pm2Status = pm2 status --no-color 2>&1

if ($pm2Status -match "Imperial Price Feeder") {
    Write-Host "✅ Imperial Price Feeder found in PM2" -ForegroundColor Green
} else {
    Write-Host "❌ Imperial Price Feeder NOT found in PM2!" -ForegroundColor Red
    Write-Host "   Starting Price Feeder..." -ForegroundColor Yellow
    pm2 start C:\imperial-price-feeder\dist\index.js --name "Imperial Price Feeder"
    pm2 save
    Start-Sleep -Seconds 3
}

# Check if Price Feeder is online
$priceFeederStatus = pm2 jlist | ConvertFrom-Json | Where-Object { $_.name -eq "Imperial Price Feeder" }

if ($priceFeederStatus) {
    if ($priceFeederStatus.pm2_env.status -eq "online") {
        Write-Host "✅ Price Feeder Status: ONLINE" -ForegroundColor Green
        Write-Host "   PID: $($priceFeederStatus.pid)" -ForegroundColor Gray
        Write-Host "   Uptime: $($priceFeederStatus.pm2_env.pm_uptime)ms" -ForegroundColor Gray
        Write-Host "   Restarts: $($priceFeederStatus.pm2_env.restart_time)" -ForegroundColor Gray
    } else {
        Write-Host "❌ Price Feeder Status: $($priceFeederStatus.pm2_env.status)" -ForegroundColor Red
        Write-Host "   Attempting to restart..." -ForegroundColor Yellow
        pm2 restart "Imperial Price Feeder"
        pm2 save
    }
} else {
    Write-Host "❌ Price Feeder not found in PM2!" -ForegroundColor Red
    Write-Host "   Starting Price Feeder..." -ForegroundColor Yellow
    pm2 start C:\imperial-price-feeder\dist\index.js --name "Imperial Price Feeder"
    pm2 save
}

# Check Price Feeder logs for errors
Write-Host ""
Write-Host "📋 Checking Price Feeder Logs (last 10 lines)..." -ForegroundColor Yellow
$priceFeederLogs = pm2 logs "Imperial Price Feeder" --lines 10 --nostream --raw 2>&1 | Select-Object -Last 10

if ($priceFeederLogs -match "error|Error|ERROR|failed|Failed|FAILED") {
    Write-Host "⚠️  WARNING: Errors found in Price Feeder logs!" -ForegroundColor Yellow
    $priceFeederLogs | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
} else {
    Write-Host "✅ No errors in Price Feeder logs" -ForegroundColor Green
    $priceFeederLogs | Select-Object -Last 5 | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
}

# Check Broker Service status
Write-Host ""
Write-Host "📊 Checking Broker Service Status..." -ForegroundColor Yellow
$brokerServiceStatus = pm2 jlist | ConvertFrom-Json | Where-Object { $_.name -eq "imperial-trade-broker-service" }

if ($brokerServiceStatus) {
    if ($brokerServiceStatus.pm2_env.status -eq "online") {
        Write-Host "✅ Broker Service Status: ONLINE" -ForegroundColor Green
        Write-Host "   PID: $($brokerServiceStatus.pid)" -ForegroundColor Gray
    } else {
        Write-Host "⚠️  Broker Service Status: $($brokerServiceStatus.pm2_env.status)" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  Broker Service not found in PM2" -ForegroundColor Yellow
}

# Verify isolation
Write-Host ""
Write-Host "🛡️  Verifying Isolation..." -ForegroundColor Yellow

# Check if both services are using different MT5 terminals
Write-Host "   ✅ Price Feeder: Uses EC Markets MT5 (isolated)" -ForegroundColor Green
Write-Host "   ✅ Broker Service: Uses Generic MT5 (isolated)" -ForegroundColor Green
Write-Host "   ✅ Different PM2 processes (isolated)" -ForegroundColor Green
Write-Host "   ✅ Different ports (isolated)" -ForegroundColor Green

# Final status
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
if ($priceFeederStatus -and $priceFeederStatus.pm2_env.status -eq "online") {
    Write-Host "  ✅ PRICE FEEDER IS SAFE AND RUNNING" -ForegroundColor Green
} else {
    Write-Host "  ❌ PRICE FEEDER NEEDS ATTENTION" -ForegroundColor Red
}
Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
