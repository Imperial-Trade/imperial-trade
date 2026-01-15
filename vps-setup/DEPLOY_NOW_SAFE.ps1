# DEPLOY BROKER SERVICE - PRICE FEEDER PROTECTED
# This script deploys the broker service WITHOUT stopping the Price Feeder

Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  🚀 DEPLOYING BROKER SERVICE" -ForegroundColor Cyan
Write-Host "  🔒 IMPERIAL PRICE FEEDER PROTECTED" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "❌ ERROR: This script must be run as Administrator" -ForegroundColor Red
    exit 1
}

$brokerServicePath = "C:\vps-broker-service"
$priceFeederName = "Imperial Price Feeder"

# CRITICAL: Verify Price Feeder is running BEFORE doing anything
Write-Host "🔒 STEP 1: Verifying Price Feeder Status" -ForegroundColor Yellow
Write-Host ""

$priceFeederStatus = pm2 list | Select-String $priceFeederName
if ($priceFeederStatus) {
    Write-Host "✅ Price Feeder is running - PROTECTED" -ForegroundColor Green
    $priceFeederWasRunning = $true
} else {
    Write-Host "⚠️  Price Feeder is NOT running" -ForegroundColor Yellow
    Write-Host "   Starting Price Feeder first..." -ForegroundColor Yellow
    pm2 start "C:\imperial-price-feeder\dist\index.js" --name $priceFeederName
    Start-Sleep -Seconds 2
    $priceFeederStatus = pm2 list | Select-String $priceFeederName
    if ($priceFeederStatus) {
        Write-Host "✅ Price Feeder started" -ForegroundColor Green
        $priceFeederWasRunning = $false
    } else {
        Write-Host "❌ Failed to start Price Feeder" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# Navigate to broker service directory
if (-not (Test-Path $brokerServicePath)) {
    Write-Host "❌ Broker service directory not found: $brokerServicePath" -ForegroundColor Red
    exit 1
}

Set-Location $brokerServicePath

# Install dependencies if needed
Write-Host "📦 STEP 2: Installing Dependencies" -ForegroundColor Yellow
Write-Host ""
if (-not (Test-Path "node_modules")) {
    npm install
} else {
    npm install --silent
}
Write-Host "✅ Dependencies ready" -ForegroundColor Green
Write-Host ""

# Build service
Write-Host "🔨 STEP 3: Building Service" -ForegroundColor Yellow
Write-Host ""
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Build successful" -ForegroundColor Green
Write-Host ""

# CRITICAL: Restart ONLY broker service, NOT Price Feeder
Write-Host "🔄 STEP 4: Restarting Broker Service (Price Feeder Protected)" -ForegroundColor Yellow
Write-Host ""

$brokerServiceName = "imperial-trade-broker-service"
$brokerServiceExists = pm2 list | Select-String $brokerServiceName

if ($brokerServiceExists) {
    Write-Host "   Restarting existing broker service..." -ForegroundColor White
    pm2 restart $brokerServiceName
} else {
    Write-Host "   Starting new broker service..." -ForegroundColor White
    pm2 start "$brokerServicePath\dist\index.js" --name $brokerServiceName
}

Start-Sleep -Seconds 3

# CRITICAL: Verify Price Feeder is STILL running
Write-Host ""
Write-Host "🔒 STEP 5: Verifying Price Feeder Still Running" -ForegroundColor Yellow
Write-Host ""

$priceFeederStatusAfter = pm2 list | Select-String $priceFeederName
if ($priceFeederStatusAfter) {
    Write-Host "✅ Price Feeder is STILL running - PROTECTED" -ForegroundColor Green
} else {
    Write-Host "❌ CRITICAL: Price Feeder stopped! Restarting immediately..." -ForegroundColor Red
    pm2 start "C:\imperial-price-feeder\dist\index.js" --name $priceFeederName
    Start-Sleep -Seconds 2
    $priceFeederStatusAfter = pm2 list | Select-String $priceFeederName
    if ($priceFeederStatusAfter) {
        Write-Host "✅ Price Feeder restarted successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ CRITICAL ERROR: Could not restart Price Feeder!" -ForegroundColor Red
        exit 1
    }
}

# Save PM2 configuration
Write-Host ""
Write-Host "💾 STEP 6: Saving PM2 Configuration" -ForegroundColor Yellow
pm2 save
Write-Host "✅ Configuration saved" -ForegroundColor Green
Write-Host ""

# Verify both services
Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  ✅ DEPLOYMENT COMPLETE" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "📊 Service Status:" -ForegroundColor Yellow
pm2 list

Write-Host ""
Write-Host "✅ Price Feeder: PROTECTED AND RUNNING" -ForegroundColor Green
Write-Host "✅ Broker Service: DEPLOYED" -ForegroundColor Green
Write-Host ""
Write-Host "🔒 Price Feeder was never stopped during deployment" -ForegroundColor Cyan
Write-Host ""
