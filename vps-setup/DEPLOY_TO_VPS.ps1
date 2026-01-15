# Complete Deployment Script for VPS Broker Service
# This script handles the entire deployment process safely

Write-Host "🚀 Imperial Trade - VPS Broker Service Deployment" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$serviceDir = "C:\vps-broker-service"
$serviceName = "imperial-trade-broker-service"
$priceFeederName = "Imperial Price Feeder"

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "❌ This script must be run as Administrator" -ForegroundColor Red
    Write-Host "   Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Running as Administrator" -ForegroundColor Green
Write-Host ""

# Step 1: Verify Price Feeder is running
Write-Host "Step 1: Checking Price Feeder status..." -ForegroundColor Cyan
$priceFeederStatus = pm2 status $priceFeederName 2>&1 | Out-String

if ($priceFeederStatus -match "online") {
    Write-Host "✅ Price Feeder is running" -ForegroundColor Green
} else {
    Write-Host "⚠️  Price Feeder is not running. Starting it..." -ForegroundColor Yellow
    pm2 start "C:\imperial-price-feeder\dist\index.js" --name "$priceFeederName"
    pm2 save
    Write-Host "✅ Price Feeder started" -ForegroundColor Green
}
Write-Host ""

# Step 2: Navigate to service directory
Write-Host "Step 2: Navigating to service directory..." -ForegroundColor Cyan
if (-not (Test-Path $serviceDir)) {
    Write-Host "❌ Service directory not found: $serviceDir" -ForegroundColor Red
    exit 1
}

Set-Location $serviceDir
Write-Host "✅ In directory: $serviceDir" -ForegroundColor Green
Write-Host ""

# Step 3: Build the service
Write-Host "Step 3: Building TypeScript code..." -ForegroundColor Cyan
$buildOutput = npm run build 2>&1 | Out-String

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build successful" -ForegroundColor Green
} else {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    Write-Host $buildOutput
    exit 1
}
Write-Host ""

# Step 4: Verify .env file exists and format
Write-Host "Step 4: Verifying .env configuration..." -ForegroundColor Cyan
$envPath = Join-Path $serviceDir ".env"

if (-not (Test-Path $envPath)) {
    Write-Host "⚠️  .env file not found. Creating template..." -ForegroundColor Yellow
    @"
VPS_API_KEY=bfa602cd4a12c93cd6a0f6cab9d93ffb0fcd4dd2392f94e48db2013d679990d
ENCRYPTION_SECRET=ImperialTrade_BrokerEncryption_2025_v1
PORT=3001
SUPABASE_URL=https://kmuoqkcxguafxulqlbmi.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_HERE
INGEST_SECRET=YOUR_INGEST_SECRET_HERE
MT5_TERMINAL_PATH=C:\Program Files\MetaTrader 5\terminal64.exe
MT5_MAX_TERMINALS=50
SYNC_INTERVAL=30000
LOGIN_DELAY_MS=500
"@ | Out-File -FilePath $envPath -Encoding UTF8
    Write-Host "⚠️  Template .env created. Please edit with correct values!" -ForegroundColor Yellow
    exit 1
}

# Check .env format (no quotes or spaces)
$envContent = Get-Content $envPath -Raw
if ($envContent -match '=\s*["'']' -or $envContent -match '=\s+["'']') {
    Write-Host "❌ .env file has incorrect format (quotes or spaces around values)" -ForegroundColor Red
    Write-Host "   Format should be: KEY=value (no quotes, no spaces)" -ForegroundColor Yellow
    Write-Host "   Example: ENCRYPTION_SECRET=ImperialTrade_BrokerEncryption_2025_v1" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ .env file exists and format is correct" -ForegroundColor Green

# Check for connection pooler URL (port 6543 instead of 5432)
if ($envContent -match 'SUPABASE_URL.*:5432') {
    Write-Host "⚠️  WARNING: Using direct database connection (port 5432)" -ForegroundColor Yellow
    Write-Host "   For production, use Supabase Connection Pooler (port 6543)" -ForegroundColor Yellow
    Write-Host "   Update SUPABASE_URL to use port 6543 for connection pooling" -ForegroundColor Yellow
}

Write-Host ""

# Step 5: Verify portable directories exist
Write-Host "Step 5: Verifying portable terminal directories..." -ForegroundColor Cyan
$terminalsPath = "C:\MT5_Terminals"
if (-not (Test-Path $terminalsPath)) {
    Write-Host "Creating portable terminal directories..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $terminalsPath -Force | Out-Null
    
    # Create terminal directories (1-50)
    for ($i = 1; $i -le 50; $i++) {
        $terminalDir = Join-Path $terminalsPath "Terminal_$i"
        if (-not (Test-Path $terminalDir)) {
            New-Item -ItemType Directory -Path $terminalDir -Force | Out-Null
        }
    }
    Write-Host "✅ Created portable terminal directories" -ForegroundColor Green
} else {
    Write-Host "✅ Portable terminal directories exist" -ForegroundColor Green
}
Write-Host ""

# Step 6: Restart the broker service
Write-Host "Step 6: Restarting broker service..." -ForegroundColor Cyan
$serviceStatus = pm2 status $serviceName 2>&1 | Out-String

if ($serviceStatus -match "online") {
    Write-Host "Service is running. Restarting..." -ForegroundColor Yellow
    pm2 restart $serviceName
    Write-Host "✅ Service restarted" -ForegroundColor Green
} elseif ($serviceStatus -match "stopped" -or $serviceStatus -match "errored") {
    Write-Host "Service is stopped. Starting..." -ForegroundColor Yellow
    pm2 start "$serviceDir\dist\index.js" --name $serviceName
    pm2 save
    Write-Host "✅ Service started" -ForegroundColor Green
} else {
    Write-Host "Service not found. Starting for first time..." -ForegroundColor Yellow
    pm2 start "$serviceDir\dist\index.js" --name $serviceName
    pm2 save
    Write-Host "✅ Service started" -ForegroundColor Green
}
Write-Host ""

# Step 7: Verify service is running
Write-Host "Step 7: Verifying service status..." -ForegroundColor Cyan
Start-Sleep -Seconds 2
$finalStatus = pm2 status $serviceName 2>&1 | Out-String

if ($finalStatus -match "online") {
    Write-Host "✅ Service is running" -ForegroundColor Green
} else {
    Write-Host "❌ Service failed to start!" -ForegroundColor Red
    Write-Host $finalStatus
    Write-Host ""
    Write-Host "Checking logs for errors..." -ForegroundColor Yellow
    pm2 logs $serviceName --lines 20 --nostream
    exit 1
}
Write-Host ""

# Step 8: Verify both services are running
Write-Host "Step 8: Final verification..." -ForegroundColor Cyan
$brokerStatus = pm2 status $serviceName 2>&1 | Out-String
$feederStatus = pm2 status $priceFeederName 2>&1 | Out-String

if ($brokerStatus -match "online" -and $feederStatus -match "online") {
    Write-Host "✅ Both services are running:" -ForegroundColor Green
    Write-Host "   - $serviceName" -ForegroundColor Green
    Write-Host "   - $priceFeederName" -ForegroundColor Green
} else {
    Write-Host "⚠️  Warning: One or more services are not running" -ForegroundColor Yellow
}
Write-Host ""

# Step 9: Display logs (last 10 lines)
Write-Host "Step 9: Recent logs..." -ForegroundColor Cyan
Write-Host "----------------------------------------" -ForegroundColor Gray
pm2 logs $serviceName --lines 10 --nostream
Write-Host "----------------------------------------" -ForegroundColor Gray
Write-Host ""

# Step 10: Configure firewall (optional but recommended)
Write-Host "Step 10: Firewall configuration (optional)..." -ForegroundColor Cyan
$configureFirewall = Read-Host "Configure Windows Firewall for port 3001? (y/N)"

if ($configureFirewall -eq "y" -or $configureFirewall -eq "Y") {
    if (Test-Path ".\vps-setup\CONFIGURE_FIREWALL.ps1") {
        Write-Host "Running firewall configuration script..." -ForegroundColor Yellow
        & ".\vps-setup\CONFIGURE_FIREWALL.ps1"
    } else {
        Write-Host "⚠️  Firewall configuration script not found" -ForegroundColor Yellow
        Write-Host "   You can configure firewall manually or run CONFIGURE_FIREWALL.ps1 later" -ForegroundColor Yellow
    }
} else {
    Write-Host "⏭️  Skipping firewall configuration (you can run CONFIGURE_FIREWALL.ps1 later)" -ForegroundColor Yellow
}
Write-Host ""

# Step 11: Next steps
Write-Host "✅ Deployment Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Monitor logs: pm2 logs $serviceName --lines 50" -ForegroundColor White
Write-Host "2. Verify portable directories: .\vps-setup\verify-portable-directories.ps1" -ForegroundColor White
Write-Host "3. Check memory usage: pm2 monit" -ForegroundColor White
Write-Host "4. Test connection from browser console" -ForegroundColor White
Write-Host "5. Configure firewall: .\vps-setup\CONFIGURE_FIREWALL.ps1" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  Critical Production Reminders:" -ForegroundColor Yellow
Write-Host "   - Monitor RAM usage (50 terminals × 250MB = 12.5GB max)" -ForegroundColor White
Write-Host "   - Configure firewall to allow port 3001 only from Supabase IPs" -ForegroundColor White
Write-Host "   - Use Supabase Connection Pooler (port 6543, Transaction Mode)" -ForegroundColor White
Write-Host "   - Stagger logins (LOGIN_DELAY_MS=500ms) to prevent broker bans" -ForegroundColor White
Write-Host "   - Use disconnect-rdp-safely.ps1 before closing RDP" -ForegroundColor White
Write-Host "   - See PRODUCTION_CONFIGURATION.md for detailed setup" -ForegroundColor White
Write-Host ""
