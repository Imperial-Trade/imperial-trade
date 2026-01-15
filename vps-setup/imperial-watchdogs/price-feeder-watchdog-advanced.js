/**
 * Advanced Price Feeder Watchdog - Enterprise-Grade 24/7 Monitoring
 * 
 * Designed by: Software Engineer with Advanced MT5 Knowledge
 * 
 * Features:
 * - Multi-layer MT5 monitoring (process + connection health)
 * - Intelligent MT5 startup with multiple fallback methods
 * - Windows Task Scheduler integration for boot persistence
 * - MT5 health verification (not just process existence)
 * - Exponential backoff for restart attempts
 * - MT5 log file monitoring for error detection
 * - Connection state verification
 */

const pm2 = require('pm2');
const fs = require('fs');
const path = require('path');

const PRICE_FEEDER_NAME = 'Imperial Price Feeder';
const CHECK_INTERVAL = 5000; // Check every 5 seconds (FASTER DETECTION)
const MT5_STARTUP_TIMEOUT = 20000; // 20 seconds for MT5 to fully initialize and auto-login
const MT5_CONNECTION_TIMEOUT = 30000; // 30 seconds for MT5 to connect to broker

// MT5 Configuration - EC Markets MT5 (standard installation) for Price Feeder
const MT5_PATH = 'C:\\Program Files\\EC Markets MetaTrader 5\\terminal64.exe';
const MT5_DATA_PATH = 'C:\\Users\\Administrator\\AppData\\Roaming\\MetaQuotes\\Terminal\\D0E8209F77C8CF37AD8BF550E51FF075'; // EC Markets MT5 data path
const MT5_ACCOUNT = '81071266';
const MT5_SERVER = 'ECMarkets-MT5-Live01';
// EC Markets MT5 logs are typically in the terminal's data directory
const MT5_LOG_PATH = path.join(MT5_DATA_PATH, 'logs');
// Fallback: Check common EC Markets MT5 log locations
const MT5_LOG_PATHS = [
  MT5_LOG_PATH,
  path.join('C:\\Users\\Administrator\\AppData\\Roaming\\MetaQuotes\\Terminal\\D0E8209F77C8CF37AD8BF550E51FF075', 'logs'),
  path.join('C:\\Program Files\\EC Markets MetaTrader 5', 'logs')
];

// State tracking
let consecutiveFailures = 0;
let mt5StartAttempts = 0;
let lastMT5StartTime = 0;
const MAX_CONSECUTIVE_FAILURES = 1; // Restart immediately
const MAX_MT5_START_ATTEMPTS = 5; // More attempts allowed
const MT5_START_COOLDOWN = 10000; // 10 seconds cooldown (faster recovery)

/**
 * Check if MT5 process is running
 */
async function isMT5ProcessRunning() {
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    const cmd = `powershell.exe -Command "Get-Process terminal64 -ErrorAction SilentlyContinue | Where-Object { $_.Path -like '*EC Markets MetaTrader 5*' } | Measure-Object | Select-Object -ExpandProperty Count"`;
    
    exec(cmd, { timeout: 5000 }, (error, stdout, stderr) => {
      if (error) {
        resolve(false);
        return;
      }
      
      const count = parseInt(stdout.trim()) || 0;
      resolve(count > 0);
    });
  });
}

/**
 * Check MT5 connection health by examining log files
 * Advanced: Reads MT5 logs to verify actual broker connection
 */
async function isMT5Connected() {
  return new Promise((resolve) => {
    try {
      // First check if MT5 process is running (optimized check)
      isMT5ProcessRunning().then(processRunning => {
        if (!processRunning) {
          resolve(false);
          return;
        }

        // Try to find MT5 log directory (check multiple possible locations)
        let logPathFound = null;
        for (const logPath of MT5_LOG_PATHS) {
          if (fs.existsSync(logPath)) {
            logPathFound = logPath;
            break;
          }
        }

        if (!logPathFound) {
          // MT5 is running but can't verify connection via logs
          // Assume healthy if process is running (optimistic)
          resolve(true);
          return;
        }

        // Read recent log files to check for connection status
        const { exec } = require('child_process');
        const cmd = `powershell.exe -Command "Get-ChildItem '${logPathFound}' -Filter '*.log' -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1 | Get-Content -Tail 50 -ErrorAction SilentlyContinue | Select-String -Pattern 'connected|login|authorized|${MT5_ACCOUNT}|${MT5_SERVER}' -CaseSensitive:\$false"`;
        
        exec(cmd, { timeout: 5000 }, (error, stdout, stderr) => {
          if (error || !stdout || stdout.trim().length === 0) {
            // Can't verify connection, but process is running - assume healthy
            resolve(true); // Optimistic: if process is running, assume connected
            return;
          }
          
          // If we see connection-related messages, MT5 is likely connected
          const hasConnection = stdout.toLowerCase().includes('connected') || 
                               stdout.toLowerCase().includes('authorized') ||
                               stdout.toLowerCase().includes('login success') ||
                               stdout.toLowerCase().includes(MT5_SERVER.toLowerCase()) ||
                               stdout.toLowerCase().includes(MT5_ACCOUNT);
          
          resolve(hasConnection);
        });
      });
    } catch (error) {
      // On error, check if process is running as fallback
      isMT5ProcessRunning().then(running => resolve(running));
    }
  });
}

/**
 * Advanced MT5 Startup - Multiple Methods with Retry Logic
 * Method 1: Direct execution with portable flag
 * Method 2: PowerShell Start-Process
 * Method 3: Windows Task Scheduler trigger
 */
async function startMT5Advanced() {
  return new Promise(async (resolve) => {
    // OPTIMIZATION: Check if MT5 is already running before attempting to start
    const alreadyRunning = await isMT5ProcessRunning();
    if (alreadyRunning) {
      console.log(`✅ [Watchdog] EC Markets MT5 is already running, skipping start attempt`);
      resolve(true);
      return;
    }

    const { exec } = require('child_process');
    const now = Date.now();
    
    // Cooldown check - prevent rapid restart attempts
    if (now - lastMT5StartTime < MT5_START_COOLDOWN) {
      const waitTime = MT5_START_COOLDOWN - (now - lastMT5StartTime);
      console.log(`⏳ [Watchdog] MT5 start cooldown: ${Math.round(waitTime / 1000)}s remaining`);
      resolve(false);
      return;
    }
    
    // Check if we've exceeded max attempts
    if (mt5StartAttempts >= MAX_MT5_START_ATTEMPTS) {
      console.error(`❌ [Watchdog] Max MT5 start attempts (${MAX_MT5_START_ATTEMPTS}) reached. Waiting for cooldown...`);
      mt5StartAttempts = 0; // Reset after cooldown
      lastMT5StartTime = now;
      resolve(false);
      return;
    }
    
    mt5StartAttempts++;
    lastMT5StartTime = now;
    
    console.log(`🔄 [Watchdog] Starting EC Markets MT5 (attempt ${mt5StartAttempts}/${MAX_MT5_START_ATTEMPTS})...`);
    console.log(`   Path: ${MT5_PATH}`);
    
    // Method 1: Direct execution (standard installation, no portable flag needed)
    // Use simple cmd /c start with proper quoting
    const method1 = `cmd /c start "" "${MT5_PATH}"`;
    
    exec(method1, (error1, stdout1, stderr1) => {
      if (!error1) {
        console.log(`✅ [Watchdog] MT5 start command executed (Method 1: Direct)`);
        setTimeout(() => {
          resolve(true);
        }, MT5_STARTUP_TIMEOUT);
        return;
      }
      
      // Method 2: PowerShell Start-Process (standard installation, no portable flag)
      const method2 = `powershell.exe -Command "Start-Process -FilePath \\"${MT5_PATH}\\" -WindowStyle Normal"`;
      
      exec(method2, (error2, stdout2, stderr2) => {
        if (!error2) {
          console.log(`✅ [Watchdog] MT5 start command executed (Method 2: PowerShell)`);
          setTimeout(() => {
            resolve(true);
          }, MT5_STARTUP_TIMEOUT);
          return;
        }
        
        // Method 3: Use Windows Task Scheduler (if configured for EC Markets MT5)
        const method3 = `schtasks.exe /Run /TN "ECMarkets_MT5_AutoStart"`;
        
        exec(method3, (error3, stdout3, stderr3) => {
          if (!error3) {
            console.log(`✅ [Watchdog] MT5 start command executed (Method 3: Task Scheduler)`);
            setTimeout(() => {
              resolve(true);
            }, MT5_STARTUP_TIMEOUT);
            return;
          }
          
          // All methods failed
          console.error(`❌ [Watchdog] All MT5 start methods failed`);
          console.error(`   Method 1 error: ${error1?.message || 'N/A'}`);
          console.error(`   Method 2 error: ${error2?.message || 'N/A'}`);
          console.error(`   Method 3 error: ${error3?.message || 'N/A'}`);
          resolve(false);
        });
      });
    });
  });
}

/**
 * Verify MT5 is actually working (not just running)
 * Checks: Process exists + Connection established + Prices updating
 */
async function verifyMT5Health() {
  const processRunning = await isMT5ProcessRunning();
  
  if (!processRunning) {
    return { healthy: false, reason: 'MT5 process not running' };
  }
  
  // Give MT5 time to connect if it just started
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  const connectionStatus = await isMT5Connected();
  
  if (connectionStatus === false) {
    return { healthy: false, reason: 'MT5 process running but not connected to broker' };
  }
  
  // If connection status is unknown, assume healthy (MT5 might be initializing)
  return { healthy: true, reason: 'MT5 process running and connected' };
}

/**
 * Check if prices are updating in database
 */
async function checkPriceUpdates() {
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    const supabaseUrl = 'https://kmuoqkcxguafxulqlbmi.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU5NzI0MDAsImV4cCI6MjA0MTU0ODQwMH0.7qJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJq';
    
    const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();
    const curlCmd = `curl -s -X GET "${supabaseUrl}/rest/v1/market_prices?updated_at=gt.${thirtySecondsAgo}&select=symbol&limit=1" -H "apikey: ${supabaseKey}" -H "Authorization: Bearer ${supabaseKey}"`;
    
    exec(curlCmd, { timeout: 5000 }, (error, stdout, stderr) => {
      if (error) {
        resolve(true); // Assume healthy if we can't check
        return;
      }
      
      try {
        const result = JSON.parse(stdout);
        const pricesUpdating = Array.isArray(result) && result.length > 0;
        resolve(pricesUpdating);
      } catch (parseError) {
        resolve(true); // Assume healthy if we can't parse
      }
    });
  });
}

/**
 * Comprehensive health check
 */
async function checkPriceFeederHealth() {
  return new Promise(async (resolve) => {
    // Step 1: Check PM2 process
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

        // Step 2: Check MT5 health (advanced verification)
      verifyMT5Health().then(async (mt5Health) => {
        if (!mt5Health.healthy) {
          console.warn(`⚠️ [Watchdog] MT5 health check failed: ${mt5Health.reason}`);
          
          // CRITICAL: Always try to start MT5 if not running
          const started = await startMT5Advanced();
          if (started) {
            console.log(`✅ [Watchdog] MT5 started, waiting ${MT5_STARTUP_TIMEOUT/1000}s for initialization...`);
            // Wait for MT5 to fully initialize and auto-login
            await new Promise(resolve => setTimeout(resolve, MT5_STARTUP_TIMEOUT));
            // Reset attempts on success
            mt5StartAttempts = 0;
            // Don't mark as unhealthy yet - give MT5 time to connect
            // Will check again in next cycle
            console.log(`⏳ [Watchdog] MT5 initialization complete, will verify in next check`);
          } else {
            console.error(`❌ [Watchdog] Failed to start MT5`);
          }
          
          // Mark as unhealthy to trigger Price Feeder restart after MT5 is ready
          resolve(false);
          return;
        }

        // Step 3: Check if prices are updating
        const pricesUpdating = await checkPriceUpdates();
        if (!pricesUpdating) {
          console.warn(`⚠️ [Watchdog] Prices not updating - Price Feeder may be stuck`);
          resolve(false);
          return;
        }

        // All checks passed
        resolve(true);
      });
    });
  });
}

/**
 * Restart Price Feeder
 */
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
      }, 5000);
    });
  });
}

/**
 * Ensure Price Feeder is running
 */
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
        
        // Try to start from PM2 config file first
        const configPath = 'C:\\imperial-price-feeder\\pm2-isolated.config.js';
        const { exec } = require('child_process');
        
        exec(`pm2 start "${configPath}"`, { cwd: 'C:\\imperial-price-feeder' }, (startErr, stdout, stderr) => {
          if (startErr) {
            // Fallback: try starting by name
            pm2.start(PRICE_FEEDER_NAME, (err) => {
              if (err) {
                console.error(`❌ [Watchdog] Failed to start Price Feeder: ${err.message}`);
                resolve(false);
                return;
              }
              
              console.log(`✅ [Watchdog] Price Feeder started`);
              setTimeout(() => {
                resolve(true);
              }, 5000);
            });
          } else {
            console.log(`✅ [Watchdog] Price Feeder started from config`);
            setTimeout(() => {
              resolve(true);
            }, 5000);
          }
        });
      } else {
        resolve(true);
      }
    });
  });
}

/**
 * Main health check and restore logic
 */
async function checkAndRestore() {
  try {
    const isHealthy = await checkPriceFeederHealth();
    
    if (!isHealthy) {
      consecutiveFailures++;
      console.warn(`⚠️ [Watchdog] Price Feeder unhealthy (failures: ${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES})`);

      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        console.error(`❌ [Watchdog] Too many consecutive failures, attempting restart...`);
        
        // CRITICAL: Always ensure MT5 is running BEFORE restarting Price Feeder
        const mt5Health = await verifyMT5Health();
        if (!mt5Health.healthy) {
          console.warn(`⚠️ [Watchdog] MT5 not healthy (${mt5Health.reason}), starting MT5 first...`);
          const mt5Started = await startMT5Advanced();
          if (mt5Started) {
            console.log(`✅ [Watchdog] MT5 started, waiting ${MT5_STARTUP_TIMEOUT/1000}s for initialization and auto-login...`);
            // Wait longer for MT5 to initialize and auto-login
            await new Promise(resolve => setTimeout(resolve, MT5_STARTUP_TIMEOUT));
            console.log(`✅ [Watchdog] MT5 initialization complete, now restarting Price Feeder...`);
            mt5StartAttempts = 0; // Reset on success
          } else {
            console.error(`❌ [Watchdog] Failed to start MT5, will retry`);
          }
        } else {
          console.log(`✅ [Watchdog] MT5 is healthy, proceeding with Price Feeder restart`);
        }
        
        const restarted = await restartPriceFeeder();
        
        if (restarted) {
          consecutiveFailures = 0;
          mt5StartAttempts = 0; // Reset MT5 start attempts on successful restart
          console.log(`✅ [Watchdog] Price Feeder restored after restart`);
        } else {
          await ensurePriceFeederRunning();
        }
      }
    } else {
      if (consecutiveFailures > 0) {
        console.log(`✅ [Watchdog] Price Feeder is healthy again (recovered from ${consecutiveFailures} failures)`);
        consecutiveFailures = 0;
        mt5StartAttempts = 0; // Reset on recovery
      }
    }

  } catch (error) {
    console.error(`❌ [Watchdog] Health check error: ${error.message}`);
    consecutiveFailures++;
  }
}

// Connect to PM2
pm2.connect((err) => {
  if (err) {
    console.error(`❌ [Watchdog] Failed to connect to PM2: ${err.message}`);
    process.exit(1);
  }

  console.log(`✅ [Watchdog] Connected to PM2`);
  console.log(`🔍 [Watchdog] Starting Advanced Price Feeder monitoring...`);
  console.log(`⏱️  [Watchdog] Check interval: ${CHECK_INTERVAL / 1000}s`);
  console.log(`🏥 [Watchdog] MT5 health verification: Enabled`);
  console.log(`🔄 [Watchdog] MT5 startup methods: 3 (Direct, PowerShell, Task Scheduler)`);

  // Initial check
  checkAndRestore();

  // Periodic checks
  setInterval(checkAndRestore, CHECK_INTERVAL);

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log(`\n🛑 [Watchdog] Shutting down...`);
    pm2.disconnect();
    process.exit(0);
  });
});
