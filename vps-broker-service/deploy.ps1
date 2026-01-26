# MT5 Broker Service Deployment Script
# Run this script on your Windows VPS to deploy the service

Write-Host "🚀 Imperial Trade MT5 Broker Service - Deployment Script" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
Write-Host "[1/6] Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "   ✅ Node.js installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Node.js not found. Please install Node.js 18+ first." -ForegroundColor Red
    exit 1
}

# Check if PM2 is installed
Write-Host "[2/6] Checking PM2 installation..." -ForegroundColor Yellow
try {
    $pm2Version = pm2 --version
    Write-Host "   ✅ PM2 installed: $pm2Version" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  PM2 not found. Installing PM2 globally..." -ForegroundColor Yellow
    npm install -g pm2
    Write-Host "   ✅ PM2 installed" -ForegroundColor Green
}

# Check if Python is installed
Write-Host "[3/6] Checking Python installation..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version
    Write-Host "   ✅ Python installed: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Python not found. Please install Python 3.8+ first." -ForegroundColor Red
    exit 1
}

# Check if MetaTrader5 package is installed
Write-Host "[4/6] Checking MetaTrader5 Python package..." -ForegroundColor Yellow
try {
    python -c "import MetaTrader5; print('MetaTrader5 version:', MetaTrader5.__version__)" 2>$null
    Write-Host "   ✅ MetaTrader5 package installed" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  MetaTrader5 package not found. Installing..." -ForegroundColor Yellow
    pip install MetaTrader5
    Write-Host "   ✅ MetaTrader5 package installed" -ForegroundColor Green
}

# Install npm dependencies
Write-Host "[5/6] Installing npm dependencies..." -ForegroundColor Yellow
if (Test-Path "package.json") {
    npm install
    Write-Host "   ✅ Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "   ❌ package.json not found in current directory" -ForegroundColor Red
    exit 1
}

# Build TypeScript
Write-Host "[6/6] Building TypeScript..." -ForegroundColor Yellow
if (Test-Path "tsconfig.json") {
    npm run build
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ TypeScript build successful" -ForegroundColor Green
    } else {
        Write-Host "   ❌ TypeScript build failed" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "   ⚠️  tsconfig.json not found. Skipping build." -ForegroundColor Yellow
}

# Create logs directory
Write-Host ""
Write-Host "[Setup] Creating logs directory..." -ForegroundColor Yellow
if (-not (Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" | Out-Null
    Write-Host "   ✅ Logs directory created" -ForegroundColor Green
} else {
    Write-Host "   ✅ Logs directory exists" -ForegroundColor Green
}

# Check for .env file
Write-Host ""
Write-Host "[Setup] Checking environment configuration..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    Write-Host "   ⚠️  .env file not found!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Please create a .env file with the following variables:" -ForegroundColor Cyan
    Write-Host "   PORT=3001" -ForegroundColor White
    Write-Host "   VPS_API_KEY=your-secure-api-key-here" -ForegroundColor White
    Write-Host "   SUPABASE_URL=https://your-project.supabase.co" -ForegroundColor White
    Write-Host "   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key" -ForegroundColor White
    Write-Host "   INGEST_SECRET=your-ingest-secret" -ForegroundColor White
    Write-Host "   SYNC_INTERVAL=30000" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "   ✅ .env file exists" -ForegroundColor Green
}

# PM2 Setup
Write-Host ""
Write-Host "[PM2] Checking PM2 configuration..." -ForegroundColor Yellow
if (Test-Path "ecosystem.config.js") {
    Write-Host "   ✅ ecosystem.config.js found" -ForegroundColor Green
    Write-Host ""
    Write-Host "   To start the service with PM2, run:" -ForegroundColor Cyan
    Write-Host "   pm2 start ecosystem.config.js" -ForegroundColor White
    Write-Host "   pm2 save" -ForegroundColor White
    Write-Host "   pm2 startup" -ForegroundColor White
} else {
    Write-Host "   ⚠️  ecosystem.config.js not found" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ Deployment script completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Create/verify .env file with your configuration" -ForegroundColor White
Write-Host "2. Start the service: pm2 start ecosystem.config.js" -ForegroundColor White
Write-Host "3. Save PM2 config: pm2 save" -ForegroundColor White
Write-Host "4. Check status: pm2 status" -ForegroundColor White
Write-Host "5. View logs: pm2 logs imperial-trade-broker-service" -ForegroundColor White
Write-Host ""








