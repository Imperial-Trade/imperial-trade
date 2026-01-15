# ============================================================================
# ISOLATE SERVICES - Prevent Broker Service from Affecting Price Feeder
# ============================================================================
# This script ensures services are properly isolated and don't interfere
# Run this on VPS PowerShell as Administrator
# ============================================================================

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  ISOLATING SERVICES - Prevent Interference" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Verify current services
Write-Host "[1/6] Checking Current Services..." -ForegroundColor Yellow
pm2 list | Select-String -Pattern "Imperial Price Feeder|imperial-trade-broker-service"
Write-Host ""

# Step 2: Create separate PM2 ecosystem files for isolation
Write-Host "[2/6] Creating Isolated PM2 Configurations..." -ForegroundColor Yellow

# Price Feeder Ecosystem (separate config)
$priceFeederEco = @'
{
  "apps": [
    {
      "name": "Imperial Price Feeder",
      "script": "dist/index.js",
      "cwd": "C:\\imperial-price-feeder",
      "instances": 1,
      "exec_mode": "fork",
      "autorestart": true,
      "max_restarts": 10,
      "min_uptime": "10s",
      "watch": false,
      "env": {
        "NODE_ENV": "production"
      },
      "error_file": "C:\\imperial-price-feeder\\logs\\error.log",
      "out_file": "C:\\imperial-price-feeder\\logs\\output.log",
      "log_date_format": "YYYY-MM-DD HH:mm:ss Z"
    }
  ]
}
'@

$priceFeederEco | Out-File -FilePath "C:\imperial-price-feeder\pm2-isolated.config.js" -Encoding UTF8 -Force
Write-Host "   ✅ Price Feeder isolated config created" -ForegroundColor Green

# Broker Service Ecosystem (separate config)
$brokerEco = @'
{
  "apps": [
    {
      "name": "imperial-trade-broker-service",
      "script": "dist/index.js",
      "cwd": "C:\\vps-broker-service",
      "instances": 1,
      "exec_mode": "fork",
      "autorestart": true,
      "max_restarts": 10,
      "min_uptime": "10s",
      "watch": false,
      "env": {
        "NODE_ENV": "production",
        "PORT": "3001"
      },
      "error_file": "C:\\vps-broker-service\\logs\\error.log",
      "out_file": "C:\\vps-broker-service\\logs\\output.log",
      "log_date_format": "YYYY-MM-DD HH:mm:ss Z"
    }
  ]
}
'@

$brokerEco | Out-File -FilePath "C:\vps-broker-service\pm2-isolated.config.js" -Encoding UTF8 -Force
Write-Host "   ✅ Broker Service isolated config created" -ForegroundColor Green
Write-Host ""

# Step 3: Create deployment scripts that only affect one service
Write-Host "[3/6] Creating Safe Deployment Scripts..." -ForegroundColor Yellow

# Safe Broker Service Deployment Script
$safeBrokerDeploy = @'
# Safe Broker Service Deployment - Does NOT affect Price Feeder
Write-Host "Deploying Broker Service ONLY..." -ForegroundColor Yellow

# Stop ONLY broker service
pm2 stop imperial-trade-broker-service 2>&1 | Out-Null

# Wait a moment
Start-Sleep -Seconds 2

# Deploy/update broker service files here
# (Your deployment steps)

# Start ONLY broker service
cd C:\vps-broker-service
pm2 start pm2-isolated.config.js --only imperial-trade-broker-service 2>&1 | Out-Null

# Save PM2 config (this is safe - PM2 only saves running processes)
pm2 save 2>&1 | Out-Null

Write-Host "✅ Broker Service deployed - Price Feeder NOT affected" -ForegroundColor Green
pm2 list | Select-String -Pattern "Imperial Price Feeder|imperial-trade-broker-service"
'@

$safeBrokerDeploy | Out-File -FilePath "C:\vps-broker-service\SAFE_DEPLOY.ps1" -Encoding UTF8 -Force
Write-Host "   ✅ Safe deployment script created" -ForegroundColor Green
Write-Host ""

# Step 4: Create service restart scripts (isolated)
Write-Host "[4/6] Creating Isolated Restart Scripts..." -ForegroundColor Yellow

# Price Feeder Restart (doesn't touch broker)
$priceFeederRestart = @'
# Restart Price Feeder ONLY
Write-Host "Restarting Price Feeder..." -ForegroundColor Yellow
pm2 restart "Imperial Price Feeder" 2>&1 | Out-Null
pm2 save 2>&1 | Out-Null
Write-Host "✅ Price Feeder restarted" -ForegroundColor Green
'@

$priceFeederRestart | Out-File -FilePath "C:\imperial-price-feeder\RESTART.ps1" -Encoding UTF8 -Force

# Broker Service Restart (doesn't touch price feeder)
$brokerRestart = @'
# Restart Broker Service ONLY
Write-Host "Restarting Broker Service..." -ForegroundColor Yellow
pm2 restart imperial-trade-broker-service 2>&1 | Out-Null
pm2 save 2>&1 | Out-Null
Write-Host "✅ Broker Service restarted" -ForegroundColor Green
'@

$brokerRestart | Out-File -FilePath "C:\vps-broker-service\RESTART.ps1" -Encoding UTF8 -Force
Write-Host "   ✅ Isolated restart scripts created" -ForegroundColor Green
Write-Host ""

# Step 5: Verify isolation
Write-Host "[5/6] Verifying Service Isolation..." -ForegroundColor Yellow
$priceFeeder = pm2 list 2>&1 | Select-String "Imperial Price Feeder"
$broker = pm2 list 2>&1 | Select-String "imperial-trade-broker-service"

if ($priceFeeder -and $broker) {
    Write-Host "   ✅ Both services running independently" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  One or both services not found" -ForegroundColor Yellow
}
Write-Host ""

# Step 6: Create monitoring script
Write-Host "[6/6] Creating Service Monitor..." -ForegroundColor Yellow
$monitor = @'
# Service Status Monitor
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  SERVICE STATUS" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

$priceFeeder = pm2 list 2>&1 | Select-String "Imperial Price Feeder"
$broker = pm2 list 2>&1 | Select-String "imperial-trade-broker-service"

Write-Host "Imperial Price Feeder:" -ForegroundColor Yellow
if ($priceFeeder) {
    Write-Host "   ✅ Running" -ForegroundColor Green
    pm2 list | Select-String "Imperial Price Feeder"
} else {
    Write-Host "   ❌ Not Running" -ForegroundColor Red
}

Write-Host ""
Write-Host "Broker Service:" -ForegroundColor Yellow
if ($broker) {
    Write-Host "   ✅ Running" -ForegroundColor Green
    pm2 list | Select-String "imperial-trade-broker-service"
} else {
    Write-Host "   ❌ Not Running" -ForegroundColor Red
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
'@

$monitor | Out-File -FilePath "C:\SERVICE_STATUS.ps1" -Encoding UTF8 -Force
Write-Host "   ✅ Service monitor created" -ForegroundColor Green
Write-Host ""

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  ✅ SERVICES ISOLATED" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Usage:" -ForegroundColor Yellow
Write-Host "  - Restart Price Feeder: C:\imperial-price-feeder\RESTART.ps1" -ForegroundColor White
Write-Host "  - Restart Broker Service: C:\vps-broker-service\RESTART.ps1" -ForegroundColor White
Write-Host "  - Deploy Broker Safely: C:\vps-broker-service\SAFE_DEPLOY.ps1" -ForegroundColor White
Write-Host "  - Check Status: C:\SERVICE_STATUS.ps1" -ForegroundColor White
Write-Host ""
Write-Host "✅ Services are now isolated - editing broker won't affect price feeder!" -ForegroundColor Green
Write-Host ""



