# 🚀 RUN THIS ON YOUR VPS NOW - Complete Auto-Sync Setup

## Quick Start

1. **Open Vultr Console**: https://my.vultr.com → Your VPS → "View Console"
2. **Open PowerShell as Administrator**
3. **Copy and paste the entire script below**

---

## 📋 Complete Setup Script

```powershell
# Copy everything from here to the end

Write-Host "=== AUTO-SYNC COMPLETE SETUP ===" -ForegroundColor Cyan

# Step 1: Verify EC Markets MT5
Write-Host "`n[1/10] Checking EC Markets MT5..." -ForegroundColor Yellow
$ecMarketsPath = "C:\Program Files\EC Markets MetaTrader 5\terminal64.exe"
$ecMarketsProcess = Get-Process -Name "terminal64" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*EC Markets*" }
if (-not $ecMarketsProcess) {
    if (Test-Path $ecMarketsPath) {
        Start-Process $ecMarketsPath
        Start-Sleep -Seconds 5
        Write-Host "   ✅ Started EC Markets MT5" -ForegroundColor Green
    } else {
        Write-Host "   ❌ EC Markets MT5 not found!" -ForegroundColor Red
    }
} else {
    Write-Host "   ✅ EC Markets MT5 running (PID: $($ecMarketsProcess.Id))" -ForegroundColor Green
}

# Step 2: Install Python MT5 Library
Write-Host "`n[2/10] Installing Python MetaTrader5..." -ForegroundColor Yellow
pip install MetaTrader5
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ MetaTrader5 installed" -ForegroundColor Green
} else {
    Write-Host "   ❌ Failed to install MetaTrader5" -ForegroundColor Red
}

# Step 3: Check Broker Service Folder
Write-Host "`n[3/10] Checking broker service..." -ForegroundColor Yellow
$brokerPath = "C:\vps-broker-service"
if (-not (Test-Path $brokerPath)) {
    Write-Host "   ❌ Broker service not found at $brokerPath" -ForegroundColor Red
    Write-Host "   ⚠️  Please copy vps-broker-service folder to C:\vps-broker-service" -ForegroundColor Yellow
    exit 1
}
Write-Host "   ✅ Broker service found" -ForegroundColor Green

# Step 4: Install Dependencies
Write-Host "`n[4/10] Installing dependencies..." -ForegroundColor Yellow
Set-Location $brokerPath
if (-not (Test-Path "node_modules")) {
    npm install
}
Write-Host "   ✅ Dependencies installed" -ForegroundColor Green

# Step 5: Create .env File
Write-Host "`n[5/10] Setting up .env file..." -ForegroundColor Yellow
$envFile = Join-Path $brokerPath ".env"
if (-not (Test-Path $envFile)) {
    @"
PORT=3001
VPS_API_KEY=imperial-trade-vps-api-key-2025
ENCRYPTION_SECRET=ImperialTrade_BrokerEncryption_2025_v1
SUPABASE_URL=https://kmuoqkcxguafxulqlbmi.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_HERE
INGEST_SECRET=YOUR_INGEST_SECRET_HERE
SYNC_INTERVAL=30000
"@ | Out-File -FilePath $envFile -Encoding UTF8
    Write-Host "   ✅ .env file created" -ForegroundColor Green
    Write-Host "   ⚠️  Edit .env file with your actual SUPABASE_SERVICE_ROLE_KEY and INGEST_SECRET!" -ForegroundColor Yellow
} else {
    Write-Host "   ✅ .env file exists" -ForegroundColor Green
}

# Step 6: Build Service
Write-Host "`n[6/10] Building service..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Build successful" -ForegroundColor Green
} else {
    Write-Host "   ❌ Build failed" -ForegroundColor Red
    exit 1
}

# Step 7: Setup PM2 Service
Write-Host "`n[7/10] Setting up PM2 service..." -ForegroundColor Yellow
$brokerService = pm2 list | Select-String "Imperial Broker Service"
if ($brokerService) {
    pm2 restart "Imperial Broker Service"
    Write-Host "   ✅ Service restarted" -ForegroundColor Green
} else {
    pm2 start dist/index.js --name "Imperial Broker Service"
    pm2 save
    Write-Host "   ✅ Service started" -ForegroundColor Green
}

# Step 8: Setup Firewall
Write-Host "`n[8/10] Setting up firewall..." -ForegroundColor Yellow
$firewallRule = Get-NetFirewallRule -DisplayName "Broker Service" -ErrorAction SilentlyContinue
if (-not $firewallRule) {
    New-NetFirewallRule -DisplayName "Broker Service" -Direction Inbound -Port 3001 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue
    Write-Host "   ✅ Firewall rule created" -ForegroundColor Green
} else {
    Write-Host "   ✅ Firewall rule exists" -ForegroundColor Green
}

# Step 9: Verify Services
Write-Host "`n[9/10] Verifying services..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
pm2 list | Select-String -Pattern "Imperial"

# Step 10: Show Logs
Write-Host "`n[10/10] Service logs:" -ForegroundColor Yellow
pm2 logs "Imperial Broker Service" --lines 10 --nostream

Write-Host "`n=== SETUP COMPLETE ===" -ForegroundColor Green
Write-Host "⚠️  Don't forget to edit C:\vps-broker-service\.env with:" -ForegroundColor Yellow
Write-Host "   - SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor Gray
Write-Host "   - INGEST_SECRET" -ForegroundColor Gray
```

---

## ✅ After Running the Script

### 1. Edit .env File

```powershell
notepad C:\vps-broker-service\.env
```

**Update these values**:
- `SUPABASE_SERVICE_ROLE_KEY` - Get from Supabase Dashboard → Settings → API
- `INGEST_SECRET` - Same as your `price-ingestor` function secret

### 2. Restart Service

```powershell
pm2 restart "Imperial Broker Service"
pm2 logs "Imperial Broker Service" --lines 20
```

### 3. Verify Everything Works

```powershell
# Check services
pm2 list

# Check EC Markets MT5
Get-Process -Name "terminal64" | Where-Object { $_.Path -like "*EC Markets*" }

# Check Python MT5
python -c "import MetaTrader5; print('OK')"
```

---

## 🎯 Expected Result

After running the script, you should see:

```
✅ EC Markets MT5 running
✅ MetaTrader5 installed
✅ Broker service built
✅ PM2 service running
✅ Firewall configured
```

**Auto-sync will start working once you update the .env file with your Supabase credentials!**


