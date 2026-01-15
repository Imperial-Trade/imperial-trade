# ============================================================================
# EXECUTE THIS DIRECTLY ON VPS - Copy entire content and paste into PowerShell
# ============================================================================

# Create directory
New-Item -ItemType Directory -Path C:\imperial-watchdogs -Force | Out-Null

# Create Price Feeder Watchdog (simplified version)
@'
const pm2 = require('pm2');
const PRICE_FEEDER_NAME = 'Imperial Price Feeder';
const CHECK_INTERVAL = 30000;
let consecutiveFailures = 0;
const MAX_CONSECUTIVE_FAILURES = 3;

async function checkPriceFeederHealth() {
  return new Promise((resolve) => {
    pm2.list((err, processes) => {
      if (err) { resolve(false); return; }
      const priceFeeder = processes.find(p => p.name === PRICE_FEEDER_NAME);
      if (!priceFeeder || priceFeeder.pm2_env.status !== 'online') { resolve(false); return; }
      resolve(true);
    });
  });
}

async function restartPriceFeeder() {
  return new Promise((resolve) => {
    pm2.restart(PRICE_FEEDER_NAME, (err) => {
      if (err) { resolve(false); return; }
      setTimeout(() => resolve(true), 10000);
    });
  });
}

async function checkAndRestore() {
  try {
    const isHealthy = await checkPriceFeederHealth();
    if (!isHealthy) {
      consecutiveFailures++;
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        await restartPriceFeeder();
        consecutiveFailures = 0;
      }
    } else {
      consecutiveFailures = 0;
    }
  } catch (error) {
    consecutiveFailures++;
  }
}

pm2.connect((err) => {
  if (err) { process.exit(1); }
  checkAndRestore();
  setInterval(checkAndRestore, CHECK_INTERVAL);
});
'@ | Out-File -FilePath C:\imperial-watchdogs\price-feeder-watchdog.js -Encoding UTF8 -Force

# Install dependencies if needed
if (-not (Test-Path C:\imperial-watchdogs\node_modules)) {
    cd C:\imperial-watchdogs
    npm install 2>&1 | Out-Null
}

# Start Price Feeder Watchdog
pm2 delete 'Price Feeder Watchdog' 2>&1 | Out-Null
cd C:\imperial-watchdogs
pm2 start price-feeder-watchdog.js --name 'Price Feeder Watchdog'
pm2 save

Write-Host "✅ Price Feeder Watchdog deployed!" -ForegroundColor Green
pm2 list | Select-String -Pattern "Price Feeder|Watchdog"



