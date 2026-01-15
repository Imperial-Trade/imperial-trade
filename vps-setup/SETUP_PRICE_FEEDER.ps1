# ============================================================================
# SETUP IMPERIAL PRICE FEEDER - Reads prices from MT5 EC Markets
# ============================================================================
# This script installs and configures the Price Feeder service
# Run this AFTER COMPLETE_VPS_ENVIRONMENT_SETUP.ps1
# ============================================================================

# Check Administrator privileges
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "❌ ERROR: Must run as Administrator!" -ForegroundColor Red
    pause
    exit 1
}

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  SETUP IMPERIAL PRICE FEEDER" -ForegroundColor Cyan
Write-Host "  Reading prices from MT5 EC Markets" -ForegroundColor Gray
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

$feederDir = "C:\imperial-price-feeder"

# Create directory
Write-Host "[1/6] Creating Price Feeder directory..." -ForegroundColor Yellow
if (-not (Test-Path $feederDir)) {
    New-Item -ItemType Directory -Path $feederDir -Force | Out-Null
    Write-Host "   ✅ Directory created: $feederDir" -ForegroundColor Green
} else {
    Write-Host "   ✅ Directory exists: $feederDir" -ForegroundColor Green
}

# Create logs directory
$logsDir = "$feederDir\logs"
if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
}

# Create Python directory
$pythonDir = "$feederDir\python"
if (-not (Test-Path $pythonDir)) {
    New-Item -ItemType Directory -Path $pythonDir -Force | Out-Null
}

Start-Sleep -Seconds 2

# Copy files (you'll need to copy these from your local machine)
Write-Host "[2/6] Setting up Price Feeder files..." -ForegroundColor Yellow
Write-Host "   ⚠️  NOTE: Copy the following files to $feederDir:" -ForegroundColor Yellow
Write-Host "      - src/index.ts" -ForegroundColor Gray
Write-Host "      - python/mt5_price_reader.py" -ForegroundColor Gray
Write-Host "      - package.json" -ForegroundColor Gray
Write-Host "      - tsconfig.json" -ForegroundColor Gray
Write-Host "      - .env (from .env.example)" -ForegroundColor Gray
Start-Sleep -Seconds 2

# Create .env file
Write-Host "[3/6] Creating .env file..." -ForegroundColor Yellow
$envContent = @"
# Imperial Price Feeder Configuration
SUPABASE_FUNCTION_URL=https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/price-ingestor
INGEST_SECRET=ImperialTrade_IngestSecret_2025_v1
PRICE_INTERVAL=1000
SYMBOLS=XAUUSD,BTCUSD,EURUSD,GBPUSD,USDJPY,U30USD,SPXUSD,NDXUSD
"@

$envPath = "$feederDir\.env"
Set-Content -Path $envPath -Value $envContent -Force
Write-Host "   ✅ .env file created" -ForegroundColor Green
Start-Sleep -Seconds 2

# Install dependencies
Write-Host "[4/6] Installing Node.js dependencies..." -ForegroundColor Yellow
Set-Location $feederDir
if (Test-Path "package.json") {
    npm install | Out-Null
    Write-Host "   ✅ Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  package.json not found - skipping npm install" -ForegroundColor Yellow
    Write-Host "   ⚠️  Copy package.json from vps-setup/imperial-price-feeder/" -ForegroundColor Yellow
}
Set-Location $env:USERPROFILE
Start-Sleep -Seconds 2

# Build TypeScript
Write-Host "[5/6] Building TypeScript..." -ForegroundColor Yellow
if (Get-Command tsc -ErrorAction SilentlyContinue) {
    if (Test-Path "$feederDir\tsconfig.json") {
        Set-Location $feederDir
        tsc | Out-Null
        Write-Host "   ✅ TypeScript compiled" -ForegroundColor Green
        Set-Location $env:USERPROFILE
    } else {
        Write-Host "   ⚠️  tsconfig.json not found - skipping build" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⚠️  TypeScript compiler not found" -ForegroundColor Yellow
    Write-Host "   ⚠️  Install: npm install -g typescript" -ForegroundColor Yellow
}
Start-Sleep -Seconds 2

# Create PM2 ecosystem file
Write-Host "[6/6] Creating PM2 configuration..." -ForegroundColor Yellow
$pm2Ecosystem = @"
module.exports = {
  apps: [
    {
      name: 'Imperial Price Feeder',
      script: './dist/index.js',
      cwd: 'C:\\imperial-price-feeder',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production'
      },
      error_file: 'C:\\imperial-price-feeder\\logs\\error.log',
      out_file: 'C:\\imperial-price-feeder\\logs\\out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true,
      restart_delay: 5000,
      max_restarts: 999999,
      min_uptime: '10s',
      listen_timeout: 10000,
      kill_timeout: 5000
    }
  ]
};
"@

$pm2ConfigPath = "$feederDir\pm2-ecosystem.config.js"
Set-Content -Path $pm2ConfigPath -Value $pm2Ecosystem -Force
Write-Host "   ✅ PM2 configuration created" -ForegroundColor Green

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  ✅ SETUP COMPLETE!" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Copy Price Feeder files to: $feederDir" -ForegroundColor White
Write-Host "  2. Ensure EC Markets MT5 is running and logged in" -ForegroundColor White
Write-Host "  3. Install Python MetaTrader5: python -m pip install MetaTrader5" -ForegroundColor White
Write-Host "  4. Build TypeScript: cd $feederDir && tsc" -ForegroundColor White
Write-Host "  5. Start service: pm2 start pm2-ecosystem.config.js" -ForegroundColor White
Write-Host "  6. Save PM2: pm2 save" -ForegroundColor White
Write-Host ""
Write-Host "Verify prices are updating in Supabase!" -ForegroundColor Green
Write-Host ""




