# ============================================================================
# PASTE THIS ENTIRE SCRIPT INTO VULTR CONSOLE (PowerShell)
# ============================================================================
# Open Vultr Console → PowerShell → Copy and paste everything below

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     AUTO-SYNC JOURNAL - COMPLETE SETUP                      ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# STEP 1: Verify EC Markets MT5
Write-Host "[1/11] Verifying EC Markets MT5 (Live Price Feed)..." -ForegroundColor Yellow
$ecMarketsPath = "C:\Program Files\EC Markets MetaTrader 5\terminal64.exe"
$ecMarketsProcess = Get-Process -Name "terminal64" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*EC Markets*" }
if ($ecMarketsProcess) {
    Write-Host "   ✅ EC Markets MT5 running (PID: $($ecMarketsProcess.Id))" -ForegroundColor Green
} else {
    if (Test-Path $ecMarketsPath) {
        Start-Process $ecMarketsPath
        Start-Sleep -Seconds 8
        Write-Host "   ✅ EC Markets MT5 started" -ForegroundColor Green
    } else {
        Write-Host "   ❌ EC Markets MT5 not found!" -ForegroundColor Red
    }
}

# STEP 2: Check Python
Write-Host "`n[2/11] Checking Python..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "   ✅ Python: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Python not found!" -ForegroundColor Red
    exit 1
}

# STEP 3: Install MetaTrader5
Write-Host "`n[3/11] Installing Python MetaTrader5..." -ForegroundColor Yellow
$mt5Check = python -c "import MetaTrader5; print('OK')" 2>&1
if ($LASTEXITCODE -ne 0) {
    pip install MetaTrader5
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ MetaTrader5 installed" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Failed to install MetaTrader5" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "   ✅ MetaTrader5 already installed" -ForegroundColor Green
}

# STEP 4: Check Node.js and PM2
Write-Host "`n[4/11] Checking Node.js and PM2..." -ForegroundColor Yellow
$nodeVersion = node --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Node.js: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "   ❌ Node.js not found!" -ForegroundColor Red
    exit 1
}

$pm2Check = pm2 --version 2>&1
if ($LASTEXITCODE -ne 0) {
    npm install -g pm2
    Write-Host "   ✅ PM2 installed" -ForegroundColor Green
} else {
    Write-Host "   ✅ PM2: $pm2Check" -ForegroundColor Green
}

# STEP 5: Check Broker Service Folder
Write-Host "`n[5/11] Checking broker service..." -ForegroundColor Yellow
$brokerPath = "C:\vps-broker-service"
if (-not (Test-Path $brokerPath)) {
    Write-Host "   ❌ Broker service not found at $brokerPath" -ForegroundColor Red
    Write-Host "   ⚠️  Please copy vps-broker-service folder to C:\vps-broker-service" -ForegroundColor Yellow
    exit 1
}
Write-Host "   ✅ Broker service found" -ForegroundColor Green

# STEP 6: Install Dependencies
Write-Host "`n[6/11] Installing dependencies..." -ForegroundColor Yellow
Set-Location $brokerPath
if (-not (Test-Path "node_modules")) {
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   ❌ Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
}
Write-Host "   ✅ Dependencies installed" -ForegroundColor Green

# STEP 7: Create .env File
Write-Host "`n[7/11] Setting up .env file..." -ForegroundColor Yellow
$envPath = Join-Path $brokerPath ".env"
if (-not (Test-Path $envPath)) {
    @"
PORT=3001
VPS_API_KEY=imperial-trade-vps-api-key-2025
ENCRYPTION_SECRET=ImperialTrade_BrokerEncryption_2025_v1
SUPABASE_URL=https://kmuoqkcxguafxulqlbmi.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_HERE
INGEST_SECRET=YOUR_INGEST_SECRET_HERE
SYNC_INTERVAL=30000
"@ | Out-File -FilePath $envPath -Encoding UTF8
    Write-Host "   ✅ .env file created" -ForegroundColor Green
    Write-Host "   ⚠️  Edit .env with your actual values!" -ForegroundColor Yellow
} else {
    Write-Host "   ✅ .env file exists" -ForegroundColor Green
}

# STEP 8: Build Service
Write-Host "`n[8/11] Building service..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ Build failed" -ForegroundColor Red
    exit 1
}
Write-Host "   ✅ Build successful" -ForegroundColor Green

# STEP 9: Setup PM2 Service
Write-Host "`n[9/11] Setting up PM2 service..." -ForegroundColor Yellow
$brokerService = pm2 list | Select-String "Imperial Broker Service"
if ($brokerService) {
    pm2 restart "Imperial Broker Service"
    Write-Host "   ✅ Service restarted" -ForegroundColor Green
} else {
    pm2 start dist/index.js --name "Imperial Broker Service"
    pm2 save
    Write-Host "   ✅ Service started" -ForegroundColor Green
}

# STEP 10: Setup Firewall
Write-Host "`n[10/11] Setting up firewall..." -ForegroundColor Yellow
$firewallRule = Get-NetFirewallRule -DisplayName "Broker Service" -ErrorAction SilentlyContinue
if (-not $firewallRule) {
    New-NetFirewallRule -DisplayName "Broker Service" -Direction Inbound -Port 3001 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue
    Write-Host "   ✅ Firewall rule created" -ForegroundColor Green
} else {
    Write-Host "   ✅ Firewall rule exists" -ForegroundColor Green
}

# STEP 11: Verification
Write-Host "`n[11/11] Final verification..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host "`n=== VERIFICATION ===" -ForegroundColor Cyan
$ecMarketsFinal = Get-Process -Name "terminal64" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*EC Markets*" }
if ($ecMarketsFinal) {
    Write-Host "✅ EC Markets MT5: RUNNING" -ForegroundColor Green
} else {
    Write-Host "❌ EC Markets MT5: NOT RUNNING" -ForegroundColor Red
}

$pythonMT5Final = python -c "import MetaTrader5; print('OK')" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Python MetaTrader5: INSTALLED" -ForegroundColor Green
} else {
    Write-Host "❌ Python MetaTrader5: NOT INSTALLED" -ForegroundColor Red
}

Write-Host "`nPM2 Services:" -ForegroundColor Cyan
pm2 list | Select-String -Pattern "Imperial"

Write-Host "`n=== SETUP COMPLETE ===" -ForegroundColor Green
Write-Host "⚠️  Edit C:\vps-broker-service\.env with your Supabase credentials!" -ForegroundColor Yellow
Write-Host "   Run: notepad C:\vps-broker-service\.env" -ForegroundColor Gray


