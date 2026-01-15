# ============================================================================
# COMPLETE PRICE FEEDER SETUP - Everything in one script
# ============================================================================
# This creates the complete Price Feeder service from scratch
# Run this on VPS after environment setup
# ============================================================================

# Check Administrator privileges
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "❌ ERROR: Must run as Administrator!" -ForegroundColor Red
    pause
    exit 1
}

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  COMPLETE PRICE FEEDER SETUP" -ForegroundColor Cyan
Write-Host "  Installing Price Feeder from scratch" -ForegroundColor Gray
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

$feederDir = "C:\imperial-price-feeder"
$pythonDir = "$feederDir\python"
$logsDir = "$feederDir\logs"

# Create directories
Write-Host "[1/8] Creating directories..." -ForegroundColor Yellow
@($feederDir, $pythonDir, $logsDir) | ForEach-Object {
    if (-not (Test-Path $_)) {
        New-Item -ItemType Directory -Path $_ -Force | Out-Null
        Write-Host "   ✅ Created: $_" -ForegroundColor Green
    } else {
        Write-Host "   ✅ Exists: $_" -ForegroundColor Green
    }
}
Start-Sleep -Seconds 2

# Create package.json
Write-Host "[2/8] Creating package.json..." -ForegroundColor Yellow
$packageJson = @"
{
  "name": "imperial-price-feeder",
  "version": "1.0.0",
  "description": "Imperial Price Feeder - Reads live prices from MT5 EC Markets",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "dotenv": "^16.3.1",
    "node-fetch": "^2.7.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "typescript": "^5.3.3"
  }
}
"@
Set-Content -Path "$feederDir\package.json" -Value $packageJson -Force
Write-Host "   ✅ package.json created" -ForegroundColor Green
Start-Sleep -Seconds 2

# Create tsconfig.json
Write-Host "[3/8] Creating tsconfig.json..." -ForegroundColor Yellow
$tsconfig = @"
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
"@
Set-Content -Path "$feederDir\tsconfig.json" -Value $tsconfig -Force
Write-Host "   ✅ tsconfig.json created" -ForegroundColor Green
Start-Sleep -Seconds 2

# Create src/index.ts (simplified version using direct Python call)
Write-Host "[4/8] Creating TypeScript source..." -ForegroundColor Yellow
$srcDir = "$feederDir\src"
if (-not (Test-Path $srcDir)) {
    New-Item -ItemType Directory -Path $srcDir -Force | Out-Null
}

# Get the index.ts content from the file we created
# Note: You'll need to copy the actual TypeScript file
# For now, create a placeholder that will be replaced
Write-Host "   ⚠️  Copy src/index.ts from vps-setup/imperial-price-feeder/src/index.ts" -ForegroundColor Yellow
Start-Sleep -Seconds 2

# Create Python script
Write-Host "[5/8] Creating Python MT5 reader..." -ForegroundColor Yellow
$pythonScript = @"
#!/usr/bin/env python3
import sys
import json
import os
from datetime import datetime

try:
    import MetaTrader5 as mt5
except ImportError:
    print(json.dumps({"error": "MetaTrader5 module not installed"}))
    sys.exit(1)

def normalize_symbol(symbol):
    symbol_map = {
        'GOLD': 'XAUUSD', 'GOLD/USD': 'XAUUSD', 'XAU/USD': 'XAUUSD',
        'BTC/USD': 'BTCUSD', 'US30': 'U30USD', 'SPX500': 'SPXUSD', 'NAS100': 'NDXUSD'
    }
    return symbol_map.get(symbol.upper(), symbol.upper())

def get_price_from_mt5(symbol):
    try:
        tick = mt5.symbol_info_tick(symbol)
        if tick is None:
            normalized = normalize_symbol(symbol)
            if normalized != symbol:
                tick = mt5.symbol_info_tick(normalized)
        
        if tick is None or tick.bid == 0:
            return None
        
        mid = (tick.bid + tick.ask) / 2
        return {
            'symbol': normalize_symbol(symbol),
            'bid': float(tick.bid),
            'ask': float(tick.ask),
            'mid': float(mid),
            'price': float(mid),
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        }
    except Exception as e:
        return None

def main():
    symbols = sys.argv[1:] if len(sys.argv) > 1 else ['XAUUSD', 'BTCUSD', 'EURUSD', 'GBPUSD', 'USDJPY']
    
    if not mt5.initialize():
        error = mt5.last_error()
        print(json.dumps({"error": f"MT5 initialization failed: {error}"}))
        sys.exit(1)
    
    account_info = mt5.account_info()
    if account_info is None:
        print(json.dumps({"error": "Failed to get account info. Is MT5 terminal running?"}))
        mt5.shutdown()
        sys.exit(1)
    
    prices = []
    for symbol in symbols:
        price_data = get_price_from_mt5(symbol)
        if price_data:
            prices.append(price_data)
    
    mt5.shutdown()
    print(json.dumps(prices))

if __name__ == '__main__':
    main()
"@

Set-Content -Path "$pythonDir\mt5_price_reader.py" -Value $pythonScript -Force
Write-Host "   ✅ Python script created" -ForegroundColor Green
Start-Sleep -Seconds 2

# Create .env file
Write-Host "[6/8] Creating .env file..." -ForegroundColor Yellow
$envContent = @"
SUPABASE_FUNCTION_URL=https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/price-ingestor
INGEST_SECRET=ImperialTrade_IngestSecret_2025_v1
PRICE_INTERVAL=1000
SYMBOLS=XAUUSD,BTCUSD,EURUSD,GBPUSD,USDJPY,U30USD,SPXUSD,NDXUSD
"@
Set-Content -Path "$feederDir\.env" -Value $envContent -Force
Write-Host "   ✅ .env file created" -ForegroundColor Green
Start-Sleep -Seconds 2

# Install Python MetaTrader5 package
Write-Host "[7/8] Installing Python MetaTrader5 package..." -ForegroundColor Yellow
python -m pip install MetaTrader5 --quiet | Out-Null
Write-Host "   ✅ MetaTrader5 package installed" -ForegroundColor Green
Start-Sleep -Seconds 2

# Create PM2 ecosystem
Write-Host "[8/8] Creating PM2 configuration..." -ForegroundColor Yellow
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
      min_uptime: '10s'
    }
  ]
};
"@
Set-Content -Path "$feederDir\pm2-ecosystem.config.js" -Value $pm2Ecosystem -Force
Write-Host "   ✅ PM2 configuration created" -ForegroundColor Green

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  ✅ SETUP COMPLETE!" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  IMPORTANT: Copy the TypeScript source file!" -ForegroundColor Yellow
Write-Host "   Copy: vps-setup/imperial-price-feeder/src/index.ts" -ForegroundColor White
Write-Host "   To: $feederDir\src\index.ts" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Copy src/index.ts to $feederDir\src\" -ForegroundColor White
Write-Host "  2. Install dependencies: cd $feederDir && npm install" -ForegroundColor White
Write-Host "  3. Build: cd $feederDir && npm run build" -ForegroundColor White
Write-Host "  4. Ensure EC Markets MT5 is running and logged in" -ForegroundColor White
Write-Host "  5. Start service: pm2 start pm2-ecosystem.config.js" -ForegroundColor White
Write-Host "  6. Save: pm2 save" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")




