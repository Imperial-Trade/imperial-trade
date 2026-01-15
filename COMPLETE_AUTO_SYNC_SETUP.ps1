# ============================================================================
# COMPLETE AUTO-SYNC SETUP SCRIPT
# Run this ENTIRE script in PowerShell on your VPS via Vultr Console
# ============================================================================

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     AUTO-SYNC JOURNAL - COMPLETE SETUP SCRIPT                ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# STEP 1: Verify EC Markets MT5 is Running
# ============================================================================
Write-Host "[1/11] Verifying EC Markets MT5 (Live Price Feed)..." -ForegroundColor Yellow
$ecMarketsPath = "C:\Program Files\EC Markets MetaTrader 5\terminal64.exe"
$ecMarketsProcess = Get-Process -Name "terminal64" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*EC Markets*" }

if ($ecMarketsProcess) {
    Write-Host "   ✅ EC Markets MT5 is running (PID: $($ecMarketsProcess.Id))" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  EC Markets MT5 not running, starting..." -ForegroundColor Yellow
    if (Test-Path $ecMarketsPath) {
        Start-Process $ecMarketsPath
        Start-Sleep -Seconds 8
        $ecMarketsProcess = Get-Process -Name "terminal64" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*EC Markets*" }
        if ($ecMarketsProcess) {
            Write-Host "   ✅ EC Markets MT5 started successfully" -ForegroundColor Green
        } else {
            Write-Host "   ❌ Failed to start EC Markets MT5" -ForegroundColor Red
        }
    } else {
        Write-Host "   ❌ EC Markets MT5 not found at: $ecMarketsPath" -ForegroundColor Red
    }
}

# ============================================================================
# STEP 2: Verify Python is Installed
# ============================================================================
Write-Host "`n[2/11] Checking Python..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Python installed: $pythonVersion" -ForegroundColor Green
    } else {
        throw "Python not found"
    }
} catch {
    Write-Host "   ❌ Python not found! Please install Python 3.11+" -ForegroundColor Red
    exit 1
}

# ============================================================================
# STEP 3: Install/Verify MetaTrader5 Python Library
# ============================================================================
Write-Host "`n[3/11] Installing Python MetaTrader5 library..." -ForegroundColor Yellow
$mt5Check = python -c "import MetaTrader5; print('OK')" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ MetaTrader5 library already installed" -ForegroundColor Green
} else {
    Write-Host "   Installing MetaTrader5..." -ForegroundColor Gray
    pip install MetaTrader5
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ MetaTrader5 library installed" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Failed to install MetaTrader5" -ForegroundColor Red
        exit 1
    }
}

# ============================================================================
# STEP 4: Verify Node.js and PM2
# ============================================================================
Write-Host "`n[4/11] Checking Node.js and PM2..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>&1
    Write-Host "   ✅ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Node.js not found!" -ForegroundColor Red
    exit 1
}

$pm2Check = pm2 --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ PM2: $pm2Check" -ForegroundColor Green
} else {
    Write-Host "   Installing PM2..." -ForegroundColor Gray
    npm install -g pm2
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ PM2 installed" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Failed to install PM2" -ForegroundColor Red
        exit 1
    }
}

# ============================================================================
# STEP 5: Verify Broker Service Folder Exists
# ============================================================================
Write-Host "`n[5/11] Checking broker service folder..." -ForegroundColor Yellow
$brokerServicePath = "C:\vps-broker-service"
if (-not (Test-Path $brokerServicePath)) {
    Write-Host "   ❌ Broker service folder not found: $brokerServicePath" -ForegroundColor Red
    Write-Host "   ⚠️  Please ensure vps-broker-service folder is copied to C:\vps-broker-service" -ForegroundColor Yellow
    Write-Host "   Creating folder structure..." -ForegroundColor Gray
    New-Item -ItemType Directory -Path $brokerServicePath -Force | Out-Null
    Write-Host "   ✅ Folder created. Please copy your vps-broker-service files here." -ForegroundColor Yellow
    exit 1
}
Write-Host "   ✅ Broker service folder found" -ForegroundColor Green

# ============================================================================
# STEP 6: Install NPM Dependencies
# ============================================================================
Write-Host "`n[6/11] Installing npm dependencies..." -ForegroundColor Yellow
Set-Location $brokerServicePath
if (-not (Test-Path "node_modules")) {
    Write-Host "   Installing packages (this may take a minute)..." -ForegroundColor Gray
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   ❌ Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
    Write-Host "   ✅ Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "   ✅ Dependencies already installed" -ForegroundColor Green
}

# ============================================================================
# STEP 7: Create/Update .env File
# ============================================================================
Write-Host "`n[7/11] Setting up .env configuration..." -ForegroundColor Yellow
$envPath = Join-Path $brokerServicePath ".env"
$envExamplePath = Join-Path $brokerServicePath ".env.example"

if (Test-Path $envPath) {
    Write-Host "   ✅ .env file exists" -ForegroundColor Green
    Write-Host "   ⚠️  Please verify these values are set:" -ForegroundColor Yellow
    Write-Host "      - SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor Gray
    Write-Host "      - INGEST_SECRET" -ForegroundColor Gray
} else {
    Write-Host "   Creating .env file..." -ForegroundColor Gray
    if (Test-Path $envExamplePath) {
        Copy-Item $envExamplePath $envPath
        Write-Host "   ✅ .env file created from .env.example" -ForegroundColor Green
    } else {
        # Create default .env
        @"
# VPS Broker Service Configuration
PORT=3001
VPS_API_KEY=imperial-trade-vps-api-key-2025

# Encryption
ENCRYPTION_SECRET=ImperialTrade_BrokerEncryption_2025_v1

# Supabase Configuration
SUPABASE_URL=https://kmuoqkcxguafxulqlbmi.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_HERE
INGEST_SECRET=YOUR_INGEST_SECRET_HERE

# Auto-Sync Configuration
SYNC_INTERVAL=30000
"@ | Out-File -FilePath $envPath -Encoding UTF8
        Write-Host "   ✅ .env file created with defaults" -ForegroundColor Green
    }
    Write-Host "   ⚠️  IMPORTANT: Edit .env file with your actual values!" -ForegroundColor Yellow
    Write-Host "      Run: notepad $envPath" -ForegroundColor Gray
}

# ============================================================================
# STEP 8: Build the Service
# ============================================================================
Write-Host "`n[8/11] Building broker service..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ Build failed. Check for TypeScript errors." -ForegroundColor Red
    exit 1
}
Write-Host "   ✅ Build successful" -ForegroundColor Green

# ============================================================================
# STEP 9: Setup PM2 Service
# ============================================================================
Write-Host "`n[9/11] Setting up PM2 service..." -ForegroundColor Yellow
$pm2List = pm2 list
$brokerService = $pm2List | Select-String "Imperial Broker Service"

if ($brokerService) {
    Write-Host "   ✅ Service exists, restarting..." -ForegroundColor Green
    pm2 restart "Imperial Broker Service"
    Start-Sleep -Seconds 2
} else {
    Write-Host "   Starting new service..." -ForegroundColor Gray
    pm2 start dist/index.js --name "Imperial Broker Service"
    pm2 save
    Start-Sleep -Seconds 2
}
Write-Host "   ✅ PM2 service configured" -ForegroundColor Green

# ============================================================================
# STEP 10: Configure Firewall
# ============================================================================
Write-Host "`n[10/11] Configuring firewall..." -ForegroundColor Yellow
$firewallRule = Get-NetFirewallRule -DisplayName "Broker Service" -ErrorAction SilentlyContinue
if (-not $firewallRule) {
    try {
        New-NetFirewallRule -DisplayName "Broker Service" -Direction Inbound -Port 3001 -Protocol TCP -Action Allow -ErrorAction Stop
        Write-Host "   ✅ Firewall rule created" -ForegroundColor Green
    } catch {
        Write-Host "   ⚠️  Could not create firewall rule (may need admin): $($_.Exception.Message)" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ✅ Firewall rule exists" -ForegroundColor Green
}

# ============================================================================
# STEP 11: Final Verification
# ============================================================================
Write-Host "`n[11/11] Final verification..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host "`n╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                    VERIFICATION RESULTS                       ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check EC Markets MT5
$ecMarketsFinal = Get-Process -Name "terminal64" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*EC Markets*" }
if ($ecMarketsFinal) {
    Write-Host "✅ EC Markets MT5: RUNNING" -ForegroundColor Green
} else {
    Write-Host "❌ EC Markets MT5: NOT RUNNING" -ForegroundColor Red
}

# Check Python MT5
$pythonMT5Final = python -c "import MetaTrader5; print('OK')" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Python MetaTrader5: INSTALLED" -ForegroundColor Green
} else {
    Write-Host "❌ Python MetaTrader5: NOT INSTALLED" -ForegroundColor Red
}

# Check PM2 Services
Write-Host "`nPM2 Services:" -ForegroundColor Cyan
pm2 list | Select-String -Pattern "Imperial"

# Show recent logs
Write-Host "`nRecent Service Logs:" -ForegroundColor Cyan
pm2 logs "Imperial Broker Service" --lines 10 --nostream

# ============================================================================
# SUMMARY
# ============================================================================
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                  SETUP COMPLETE!                             ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  NEXT STEPS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Edit .env file with your Supabase credentials:" -ForegroundColor White
Write-Host "   notepad C:\vps-broker-service\.env" -ForegroundColor Gray
Write-Host ""
Write-Host "   Required values:" -ForegroundColor White
Write-Host "   - SUPABASE_SERVICE_ROLE_KEY (from Supabase Dashboard)" -ForegroundColor Gray
Write-Host "   - INGEST_SECRET (same as price-ingestor function)" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Restart the service:" -ForegroundColor White
Write-Host "   pm2 restart `"Imperial Broker Service`"" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Monitor logs:" -ForegroundColor White
Write-Host "   pm2 logs `"Imperial Broker Service`" --lines 30" -ForegroundColor Gray
Write-Host ""
Write-Host "✅ Auto-sync will start working once .env is configured!" -ForegroundColor Green
Write-Host ""


