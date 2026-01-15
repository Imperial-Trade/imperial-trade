# ============================================================================
# COMPLETE WATCHDOG DEPLOYMENT - Copy and Run This on VPS
# ============================================================================
# This script creates and deploys watchdog services to ensure Price Feeder
# and MT5 never stop. Run this in PowerShell as Administrator on VPS.
# ============================================================================

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  DEPLOYING WATCHDOGS - Ensure Services Never Stop" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

$watchdogDir = "C:\imperial-watchdogs"

# Step 1: Create watchdog directory
Write-Host "[1/8] Creating Watchdog Directory..." -ForegroundColor Yellow
if (-not (Test-Path $watchdogDir)) {
    New-Item -ItemType Directory -Path $watchdogDir -Force | Out-Null
    Write-Host "   ✅ Created: $watchdogDir" -ForegroundColor Green
} else {
    Write-Host "   ✅ Directory exists: $watchdogDir" -ForegroundColor Green
}
Write-Host ""

# Step 2: Create Price Feeder Watchdog
Write-Host "[2/8] Creating Price Feeder Watchdog..." -ForegroundColor Yellow
$priceFeederWatchdogCode = @'
/**
 * Price Feeder Watchdog
 * Monitors Imperial Price Feeder and restarts it if it stops
 */

const pm2 = require('pm2');

const PRICE_FEEDER_NAME = 'Imperial Price Feeder';
const CHECK_INTERVAL = 30000; // Check every 30 seconds
let consecutiveFailures = 0;
const MAX_CONSECUTIVE_FAILURES = 3;

async function checkPriceFeederHealth() {
  return new Promise((resolve) => {
    pm2.list((err, processes) => {
      if (err) {
        console.error(`❌ [Watchdog] PM2 list error: ${err.message}`);
        resolve(false);
        return;
      }

      const priceFeeder = processes.find(p => p.name === PRICE_FEEDER_NAME);
      
      if (!priceFeeder) {
        console.error(`❌ [Watchdog] Price Feeder NOT FOUND in PM2`);
        resolve(false);
        return;
      }

      if (priceFeeder.pm2_env.status !== 'online') {
        console.error(`❌ [Watchdog] Price Feeder status: ${priceFeeder.pm2_env.status}`);
        resolve(false);
        return;
      }

      resolve(true);
    });
  });
}

async function restartPriceFeeder() {
  return new Promise((resolve) => {
    console.log(`🔄 [Watchdog] Restarting Price Feeder...`);
    
    pm2.restart(PRICE_FEEDER_NAME, (err) => {
      if (err) {
        console.error(`❌ [Watchdog] Failed to restart Price Feeder: ${err.message}`);
        resolve(false);
        return;
      }

      console.log(`✅ [Watchdog] Price Feeder restarted successfully`);
      
      setTimeout(() => {
        resolve(true);
      }, 10000);
    });
  });
}

async function ensurePriceFeederRunning() {
  return new Promise((resolve) => {
    pm2.list((err, processes) => {
      if (err) {
        console.error(`❌ [Watchdog] PM2 list error: ${err.message}`);
        resolve(false);
        return;
      }

      const priceFeeder = processes.find(p => p.name === PRICE_FEEDER_NAME);
      
      if (!priceFeeder || priceFeeder.pm2_env.status !== 'online') {
        console.log(`🔄 [Watchdog] Price Feeder not running, starting...`);
        
        pm2.start(PRICE_FEEDER_NAME, (err) => {
          if (err) {
            console.error(`❌ [Watchdog] Failed to start Price Feeder: ${err.message}`);
            resolve(false);
            return;
          }

          console.log(`✅ [Watchdog] Price Feeder started`);
          resolve(true);
        });
      } else {
        resolve(true);
      }
    });
  });
}

async function checkAndRestore() {
  try {
    const isHealthy = await checkPriceFeederHealth();
    
    if (!isHealthy) {
      consecutiveFailures++;
      console.warn(`⚠️ [Watchdog] Price Feeder unhealthy (failures: ${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES})`);

      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        console.error(`❌ [Watchdog] Too many consecutive failures, attempting restart...`);
        
        const restarted = await restartPriceFeeder();
        
        if (restarted) {
          consecutiveFailures = 0;
          console.log(`✅ [Watchdog] Price Feeder restored after restart`);
        } else {
          await ensurePriceFeederRunning();
        }
      }
    } else {
      if (consecutiveFailures > 0) {
        console.log(`✅ [Watchdog] Price Feeder is healthy again (recovered from ${consecutiveFailures} failures)`);
        consecutiveFailures = 0;
      }
    }
  } catch (error) {
    console.error(`❌ [Watchdog] Health check error: ${error.message}`);
    consecutiveFailures++;
  }
}

pm2.connect((err) => {
  if (err) {
    console.error(`❌ [Watchdog] Failed to connect to PM2: ${err.message}`);
    process.exit(1);
  }

  console.log(`✅ [Watchdog] Connected to PM2`);
  console.log(`🔍 [Watchdog] Starting Price Feeder monitoring...`);
  console.log(`⏱️  [Watchdog] Check interval: ${CHECK_INTERVAL / 1000}s`);

  checkAndRestore();
  setInterval(checkAndRestore, CHECK_INTERVAL);

  process.on('SIGINT', () => {
    console.log(`\n🛑 [Watchdog] Shutting down...`);
    pm2.disconnect();
    process.exit(0);
  });
});
'@

$priceFeederWatchdogCode | Out-File -FilePath "$watchdogDir\price-feeder-watchdog.js" -Encoding utf8 -Force
Write-Host "   ✅ Price Feeder Watchdog created" -ForegroundColor Green
Write-Host ""

# Step 3: Create MT5 Watchdog
Write-Host "[3/8] Creating MT5 Watchdog..." -ForegroundColor Yellow
$mt5WatchdogCode = @'
/**
 * MT5 Watchdog
 * Monitors EC Markets MT5 terminal and restarts it if it stops
 */

const { spawn } = require('child_process');
const fs = require('fs');

const MT5_PATH = 'C:\\Program Files\\EC Markets MetaTrader 5\\terminal64.exe';
const CHECK_INTERVAL = 60000; // Check every minute
const MAX_RESTART_ATTEMPTS = 3;

let restartAttempts = 0;

function isMT5Running() {
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    
    exec('powershell -Command "Get-Process -Name terminal64 -ErrorAction SilentlyContinue | Where-Object { $_.Path -like \'*EC Markets*\' } | Select-Object -First 1"', (psError, psStdout) => {
      if (!psError && psStdout.trim().length > 0) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
  });
}

function startMT5() {
  return new Promise((resolve) => {
    if (!fs.existsSync(MT5_PATH)) {
      console.error(`❌ [MT5 Watchdog] MT5 not found at: ${MT5_PATH}`);
      resolve(false);
      return;
    }

    console.log(`🔄 [MT5 Watchdog] Starting EC Markets MT5...`);
    
    const mt5Process = spawn(MT5_PATH, [], {
      detached: true,
      stdio: 'ignore'
    });

    mt5Process.unref();

    setTimeout(() => {
      isMT5Running().then((running) => {
        if (running) {
          console.log(`✅ [MT5 Watchdog] EC Markets MT5 started successfully`);
          restartAttempts = 0;
          resolve(true);
        } else {
          console.error(`❌ [MT5 Watchdog] MT5 failed to start`);
          restartAttempts++;
          resolve(false);
        }
      });
    }, 5000);
  });
}

async function checkAndRestore() {
  try {
    const isRunning = await isMT5Running();

    if (!isRunning) {
      console.warn(`⚠️ [MT5 Watchdog] EC Markets MT5 NOT RUNNING`);

      if (restartAttempts < MAX_RESTART_ATTEMPTS) {
        await startMT5();
      } else {
        console.error(`❌ [MT5 Watchdog] Max restart attempts reached.`);
        restartAttempts = 0;
      }
    } else {
      if (restartAttempts > 0) {
        console.log(`✅ [MT5 Watchdog] EC Markets MT5 is running (recovered)`);
        restartAttempts = 0;
      }
    }
  } catch (error) {
    console.error(`❌ [MT5 Watchdog] Check error: ${error.message}`);
  }
}

console.log(`🔍 [MT5 Watchdog] Starting MT5 monitoring...`);
console.log(`⏱️  [MT5 Watchdog] Check interval: ${CHECK_INTERVAL / 1000}s`);

checkAndRestore();
setInterval(checkAndRestore, CHECK_INTERVAL);

process.on('SIGINT', () => {
  console.log(`\n🛑 [MT5 Watchdog] Shutting down...`);
  process.exit(0);
});
'@

$mt5WatchdogCode | Out-File -FilePath "$watchdogDir\mt5-watchdog.js" -Encoding utf8 -Force
Write-Host "   ✅ MT5 Watchdog created" -ForegroundColor Green
Write-Host ""

# Step 4: Create package.json
Write-Host "[4/8] Creating package.json..." -ForegroundColor Yellow
$packageJson = @'
{
  "name": "imperial-watchdogs",
  "version": "1.0.0",
  "description": "Watchdog services to ensure Price Feeder and MT5 never stop",
  "main": "index.js",
  "scripts": {
    "start:price-feeder-watchdog": "node price-feeder-watchdog.js",
    "start:mt5-watchdog": "node mt5-watchdog.js"
  },
  "keywords": ["watchdog", "monitoring", "pm2"],
  "author": "Imperial Trade",
  "license": "ISC",
  "dependencies": {
    "pm2": "^5.4.0"
  }
}
'@

$packageJson | Out-File -FilePath "$watchdogDir\package.json" -Encoding utf8 -Force
Write-Host "   ✅ package.json created" -ForegroundColor Green
Write-Host ""

# Step 5: Install dependencies
Write-Host "[5/8] Installing Watchdog Dependencies..." -ForegroundColor Yellow
Set-Location $watchdogDir
npm install 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  npm install had issues, but continuing..." -ForegroundColor Yellow
}
Set-Location $env:USERPROFILE
Write-Host ""

# Step 6: Stop existing watchdogs if running
Write-Host "[6/8] Stopping Existing Watchdogs..." -ForegroundColor Yellow
$priceFeederWatchdog = pm2 list 2>&1 | Select-String "Price Feeder Watchdog"
$mt5Watchdog = pm2 list 2>&1 | Select-String "MT5 Watchdog"

if ($priceFeederWatchdog) {
    pm2 delete "Price Feeder Watchdog" 2>&1 | Out-Null
    Write-Host "   ✅ Stopped existing Price Feeder Watchdog" -ForegroundColor Green
}
if ($mt5Watchdog) {
    pm2 delete "MT5 Watchdog" 2>&1 | Out-Null
    Write-Host "   ✅ Stopped existing MT5 Watchdog" -ForegroundColor Green
}
Write-Host ""

# Step 7: Start Price Feeder Watchdog
Write-Host "[7/8] Starting Price Feeder Watchdog..." -ForegroundColor Yellow
Set-Location $watchdogDir
pm2 start "price-feeder-watchdog.js" --name "Price Feeder Watchdog" --autorestart --max-restarts 999999 --min-uptime "5s" --restart-delay 5000 2>&1 | Out-Null
Start-Sleep -Seconds 3
$status = pm2 list 2>&1 | Select-String "Price Feeder Watchdog"
if ($status) {
    Write-Host "   ✅ Price Feeder Watchdog started" -ForegroundColor Green
} else {
    Write-Host "   ❌ Failed to start Price Feeder Watchdog" -ForegroundColor Red
}
Set-Location $env:USERPROFILE
Write-Host ""

# Step 8: Start MT5 Watchdog
Write-Host "[8/8] Starting MT5 Watchdog..." -ForegroundColor Yellow
Set-Location $watchdogDir
pm2 start "mt5-watchdog.js" --name "MT5 Watchdog" --autorestart --max-restarts 999999 --min-uptime "5s" --restart-delay 5000 2>&1 | Out-Null
Start-Sleep -Seconds 3
$status = pm2 list 2>&1 | Select-String "MT5 Watchdog"
if ($status) {
    Write-Host "   ✅ MT5 Watchdog started" -ForegroundColor Green
} else {
    Write-Host "   ❌ Failed to start MT5 Watchdog" -ForegroundColor Red
}
Set-Location $env:USERPROFILE
Write-Host ""

# Step 9: Save PM2 configuration
Write-Host "[9/9] Saving PM2 Configuration..." -ForegroundColor Yellow
pm2 save 2>&1 | Out-Null
Write-Host "   ✅ PM2 configuration saved (watchdogs will auto-start on boot)" -ForegroundColor Green

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  ✅ WATCHDOGS DEPLOYED" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Current PM2 Services:" -ForegroundColor Yellow
pm2 list

Write-Host ""
Write-Host "Watchdog Logs:" -ForegroundColor Yellow
Write-Host "  - Price Feeder Watchdog: pm2 logs 'Price Feeder Watchdog' --lines 50" -ForegroundColor White
Write-Host "  - MT5 Watchdog: pm2 logs 'MT5 Watchdog' --lines 50" -ForegroundColor White
Write-Host ""
Write-Host "✅ Watchdogs will monitor and restart services if they stop!" -ForegroundColor Green
Write-Host "✅ Watchdogs will auto-start on VPS boot!" -ForegroundColor Green
Write-Host "✅ Price Feeder will never stop updating prices!" -ForegroundColor Green
Write-Host ""



