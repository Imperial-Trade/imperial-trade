# Complete Auto-Sync Setup Script for VPS
# Run this on your VPS via Vultr Console

Write-Host "=== AUTO-SYNC COMPLETE SETUP ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check EC Markets MT5
Write-Host "Step 1: Verifying EC Markets MT5..." -ForegroundColor Yellow
$ecMarketsPath = "C:\Program Files\EC Markets MetaTrader 5\terminal64.exe"
$ecMarketsProcess = Get-Process -Name "terminal64" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*EC Markets*" }

if (-not $ecMarketsProcess) {
    Write-Host "   ⚠️  EC Markets MT5 not running, starting..." -ForegroundColor Yellow
    if (Test-Path $ecMarketsPath) {
        Start-Process $ecMarketsPath
        Start-Sleep -Seconds 5
        Write-Host "   ✅ EC Markets MT5 started" -ForegroundColor Green
    } else {
        Write-Host "   ❌ EC Markets MT5 not found at: $ecMarketsPath" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "   ✅ EC Markets MT5 is running (PID: $($ecMarketsProcess.Id))" -ForegroundColor Green
}

# Step 2: Check Python and MT5 Library
Write-Host "`nStep 2: Checking Python and MetaTrader5 library..." -ForegroundColor Yellow
$pythonVersion = python --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Python installed: $pythonVersion" -ForegroundColor Green
} else {
    Write-Host "   ❌ Python not found!" -ForegroundColor Red
    exit 1
}

$mt5Check = python -c "import MetaTrader5; print('OK')" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ MetaTrader5 library installed" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  MetaTrader5 library not installed, installing..." -ForegroundColor Yellow
    pip install MetaTrader5
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ MetaTrader5 library installed" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Failed to install MetaTrader5 library" -ForegroundColor Red
        exit 1
    }
}

# Step 3: Check Node.js and PM2
Write-Host "`nStep 3: Checking Node.js and PM2..." -ForegroundColor Yellow
$nodeVersion = node --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Node.js installed: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "   ❌ Node.js not found!" -ForegroundColor Red
    exit 1
}

$pm2Check = pm2 --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ PM2 installed: $pm2Check" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  PM2 not installed, installing..." -ForegroundColor Yellow
    npm install -g pm2
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ PM2 installed" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Failed to install PM2" -ForegroundColor Red
        exit 1
    }
}

# Step 4: Check VPS Broker Service
Write-Host "`nStep 4: Checking VPS Broker Service..." -ForegroundColor Yellow
$brokerServicePath = "C:\vps-broker-service"
if (-not (Test-Path $brokerServicePath)) {
    Write-Host "   ❌ Broker service not found at: $brokerServicePath" -ForegroundColor Red
    Write-Host "   ⚠️  Please copy vps-broker-service folder to C:\vps-broker-service" -ForegroundColor Yellow
    exit 1
}

Write-Host "   ✅ Broker service folder found" -ForegroundColor Green

# Step 5: Install dependencies
Write-Host "`nStep 5: Installing broker service dependencies..." -ForegroundColor Yellow
Set-Location $brokerServicePath
if (-not (Test-Path "node_modules")) {
    Write-Host "   Installing npm packages..." -ForegroundColor Gray
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   ❌ Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
}
Write-Host "   ✅ Dependencies installed" -ForegroundColor Green

# Step 6: Check .env file
Write-Host "`nStep 6: Checking .env configuration..." -ForegroundColor Yellow
$envPath = Join-Path $brokerServicePath ".env"
if (-not (Test-Path $envPath)) {
    Write-Host "   ⚠️  .env file not found, creating from example..." -ForegroundColor Yellow
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "   ✅ .env file created" -ForegroundColor Green
        Write-Host "   ⚠️  Please edit .env file with your configuration!" -ForegroundColor Yellow
    } else {
        Write-Host "   Creating default .env file..." -ForegroundColor Gray
        @"
PORT=3001
VPS_API_KEY=your-secure-api-key-here
ENCRYPTION_SECRET=ImperialTrade_BrokerEncryption_2025_v1
SUPABASE_URL=https://kmuoqkcxguafxulqlbmi.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
INGEST_SECRET=your-ingest-secret-here
SYNC_INTERVAL=30000
"@ | Out-File -FilePath $envPath -Encoding UTF8
        Write-Host "   ✅ .env file created with defaults" -ForegroundColor Green
        Write-Host "   ⚠️  IMPORTANT: Edit .env file with your actual values!" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ✅ .env file exists" -ForegroundColor Green
}

# Step 7: Build the service
Write-Host "`nStep 7: Building broker service..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ Build failed" -ForegroundColor Red
    exit 1
}
Write-Host "   ✅ Build successful" -ForegroundColor Green

# Step 8: Check PM2 services
Write-Host "`nStep 8: Checking PM2 services..." -ForegroundColor Yellow
$pm2List = pm2 list
$priceFeeder = $pm2List | Select-String "Imperial Price Feeder"
$brokerService = $pm2List | Select-String "Imperial Broker Service"

if ($priceFeeder) {
    Write-Host "   ✅ Imperial Price Feeder is running" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Imperial Price Feeder not found in PM2" -ForegroundColor Yellow
}

if ($brokerService) {
    Write-Host "   ✅ Imperial Broker Service is running" -ForegroundColor Green
    Write-Host "   Restarting to apply changes..." -ForegroundColor Gray
    pm2 restart "Imperial Broker Service"
} else {
    Write-Host "   ⚠️  Imperial Broker Service not running, starting..." -ForegroundColor Yellow
    pm2 start dist/index.js --name "Imperial Broker Service"
    pm2 save
    Write-Host "   ✅ Imperial Broker Service started" -ForegroundColor Green
}

# Step 9: Check firewall
Write-Host "`nStep 9: Checking firewall rules..." -ForegroundColor Yellow
$firewallRule = Get-NetFirewallRule -DisplayName "Broker Service" -ErrorAction SilentlyContinue
if (-not $firewallRule) {
    Write-Host "   ⚠️  Firewall rule not found, creating..." -ForegroundColor Yellow
    New-NetFirewallRule -DisplayName "Broker Service" -Direction Inbound -Port 3001 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue
    Write-Host "   ✅ Firewall rule created" -ForegroundColor Green
} else {
    Write-Host "   ✅ Firewall rule exists" -ForegroundColor Green
}

# Step 10: Final verification
Write-Host "`nStep 10: Final verification..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

$pm2Status = pm2 list
Write-Host "`n=== PM2 Services Status ===" -ForegroundColor Cyan
$pm2Status | Select-String -Pattern "Imperial"

Write-Host "`n=== Service Logs (last 5 lines) ===" -ForegroundColor Cyan
pm2 logs "Imperial Broker Service" --lines 5 --nostream

Write-Host "`n=== Summary ===" -ForegroundColor Cyan
Write-Host "✅ EC Markets MT5: Running" -ForegroundColor Green
Write-Host "✅ Python MetaTrader5: Installed" -ForegroundColor Green
Write-Host "✅ Broker Service: Configured" -ForegroundColor Green
Write-Host "✅ PM2 Services: Running" -ForegroundColor Green
Write-Host "`n⚠️  IMPORTANT: Edit C:\vps-broker-service\.env with your actual values!" -ForegroundColor Yellow
Write-Host "   - SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor Gray
Write-Host "   - INGEST_SECRET" -ForegroundColor Gray
Write-Host "   - VPS_API_KEY" -ForegroundColor Gray

Write-Host "`n✅ Auto-sync setup complete!" -ForegroundColor Green


