/**
 * MT5 Watchdog
 * Monitors EC Markets MT5 terminal and restarts it if it stops
 * Ensures MT5 is always running for price feeds
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
    
    exec('tasklist /FI "IMAGENAME eq terminal64.exe" /FO CSV', (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ [MT5 Watchdog] Error checking MT5: ${error.message}`);
        resolve(false);
        return;
      }

      // Check if any terminal64.exe process exists with "EC Markets" in path
      const lines = stdout.split('\n');
      let foundECMarkets = false;

      for (const line of lines) {
        if (line.includes('terminal64.exe') && line.includes('EC Markets')) {
          foundECMarkets = true;
          break;
        }
      }

      // More comprehensive check using PowerShell
      exec('powershell -Command "Get-Process -Name terminal64 -ErrorAction SilentlyContinue | Where-Object { $_.Path -like \'*EC Markets*\' } | Select-Object -First 1"', (psError, psStdout) => {
        if (!psError && psStdout.trim().length > 0) {
          resolve(true);
        } else {
          resolve(foundECMarkets);
        }
      });
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

    // Wait a bit to see if it starts
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
        console.error(`❌ [MT5 Watchdog] Max restart attempts reached. Manual intervention may be required.`);
        console.error(`💡 [MT5 Watchdog] Please check if MT5 is installed and can be started manually.`);
        restartAttempts = 0; // Reset after warning
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

// Start monitoring
console.log(`🔍 [MT5 Watchdog] Starting MT5 monitoring...`);
console.log(`⏱️  [MT5 Watchdog] Check interval: ${CHECK_INTERVAL / 1000}s`);
console.log(`📍 [MT5 Watchdog] MT5 path: ${MT5_PATH}`);

// Initial check
checkAndRestore();

// Periodic checks
setInterval(checkAndRestore, CHECK_INTERVAL);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log(`\n🛑 [MT5 Watchdog] Shutting down...`);
  process.exit(0);
});




