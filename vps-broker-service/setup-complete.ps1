# Complete MT5 Broker Service Setup Script
# Run this script on your Windows VPS to complete the setup

Write-Host "🚀 MT5 Broker Service - Complete Setup" -ForegroundColor Cyan
Write-Host ""

# Generated API Key
$VPS_API_KEY = "bfa602cd4a12c93cd6a0f6cab9d93ff7b0fcd4dd2392f94e48db2013d679990d"
$SUPABASE_URL = "https://kmuoqkcxguafxulqlbmi.supabase.co"

Write-Host "📝 Generated Configuration Values:" -ForegroundColor Yellow
Write-Host "   VPS_API_KEY: $VPS_API_KEY" -ForegroundColor Green
Write-Host "   SUPABASE_URL: $SUPABASE_URL" -ForegroundColor Green
Write-Host ""

# Create .env file
Write-Host "[1/4] Creating .env file..." -ForegroundColor Yellow
$envContent = @"
# MT5 Broker Service Environment Configuration
# Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

# Server Configuration
PORT=3001
NODE_ENV=production

# API Security - Secure API Key (GENERATED)
VPS_API_KEY=$VPS_API_KEY

# Supabase Configuration (for auto-sync)
SUPABASE_URL=$SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_HERE
INGEST_SECRET=YOUR_INGEST_SECRET_HERE

# Auto-sync Interval (milliseconds) - 30000 = 30 seconds
SYNC_INTERVAL=30000
"@

if (Test-Path ".env") {
    Write-Host "   ⚠️  .env file already exists. Creating backup..." -ForegroundColor Yellow
    Copy-Item ".env" ".env.backup"
}

$envContent | Out-File -FilePath ".env" -Encoding UTF8
Write-Host "   ✅ .env file created" -ForegroundColor Green

# Get VPS IP Address
Write-Host "[2/4] Getting VPS IP address..." -ForegroundColor Yellow
try {
    $vpsIp = (Invoke-WebRequest -Uri "http://ifconfig.me/ip" -UseBasicParsing -TimeoutSec 5).Content.Trim()
    Write-Host "   ✅ VPS IP Address: $vpsIp" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Could not automatically detect VPS IP" -ForegroundColor Yellow
    Write-Host "   💡 You'll need to manually enter your VPS IP" -ForegroundColor Yellow
    $vpsIp = "YOUR_VPS_IP"
}

# Install dependencies
Write-Host "[3/4] Installing dependencies..." -ForegroundColor Yellow
if (Test-Path "package.json") {
    npm install
    Write-Host "   ✅ Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "   ❌ package.json not found" -ForegroundColor Red
    exit 1
}

# Build TypeScript
Write-Host "[4/4] Building TypeScript..." -ForegroundColor Yellow
if (Test-Path "tsconfig.json") {
    npm run build
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ TypeScript build successful" -ForegroundColor Green
    } else {
        Write-Host "   ❌ TypeScript build failed" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "   ⚠️  tsconfig.json not found" -ForegroundColor Yellow
}

# Create logs directory
if (-not (Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" | Out-Null
}

Write-Host ""
Write-Host "✅ Local setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 NEXT STEPS:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Update .env file with Supabase credentials:" -ForegroundColor White
Write-Host "   - SUPABASE_SERVICE_ROLE_KEY (get from Supabase dashboard)" -ForegroundColor Gray
Write-Host "   - INGEST_SECRET (your ingest secret)" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Add secrets to Supabase Dashboard:" -ForegroundColor White
Write-Host "   Go to: https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/functions/secrets" -ForegroundColor Gray
Write-Host ""
Write-Host "   Add these two secrets:" -ForegroundColor Yellow
Write-Host "   - VPS_MT5_SERVICE_URL = http://$vpsIp:3001" -ForegroundColor Green
Write-Host "   - VPS_API_KEY = $VPS_API_KEY" -ForegroundColor Green
Write-Host ""
Write-Host "3. Start the service:" -ForegroundColor White
Write-Host "   pm2 start ecosystem.config.js" -ForegroundColor Gray
Write-Host "   pm2 save" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Verify service is running:" -ForegroundColor White
Write-Host "   pm2 status" -ForegroundColor Gray
Write-Host "   curl http://localhost:3001/health" -ForegroundColor Gray
Write-Host ""








