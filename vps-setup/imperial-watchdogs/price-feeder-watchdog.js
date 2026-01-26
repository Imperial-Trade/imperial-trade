/**
 * Price Feeder Watchdog
 * Monitors Imperial Price Feeder and restarts it if it stops
 * Ensures prices never stop updating
 */

const pm2 = require('pm2');

const PRICE_FEEDER_NAME = 'Imperial Price Feeder';
const CHECK_INTERVAL = 10000; // Check every 10 seconds (FAST RESTART)

let consecutiveFailures = 0;
const MAX_CONSECUTIVE_FAILURES = 1; // Restart immediately after 1 failure (FAST RESTART)

// Function to check if prices are updating in database (within last 30 seconds)
async function checkPriceUpdates() {
  return new Promise((resolve) => {
    // Use curl to query Supabase REST API for recent price updates
    const { exec } = require('child_process');
    const supabaseUrl = 'https://kmuoqkcxguafxulqlbmi.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU5NzI0MDAsImV4cCI6MjA0MTU0ODQwMH0.7qJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJq';
    
    // Query market_prices table for recent updates (last 30 seconds)
    // Use PostgREST filter: updated_at=gt.(now() - 30 seconds)
    const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();
    const curlCmd = `curl -s -X GET "${supabaseUrl}/rest/v1/market_prices?updated_at=gt.${thirtySecondsAgo}&select=symbol&limit=1" -H "apikey: ${supabaseKey}" -H "Authorization: Bearer ${supabaseKey}"`;
    
    exec(curlCmd, { timeout: 5000 }, (error, stdout, stderr) => {
      if (error) {
        console.warn(`⚠️ [Watchdog] Could not check price updates: ${error.message}`);
        // If we can't check, assume prices are updating (don't trigger false alarms)
        resolve(true);
        return;
      }
      
      try {
        const result = JSON.parse(stdout);
        const pricesUpdating = Array.isArray(result) && result.length > 0;
        
        if (!pricesUpdating) {
          console.warn(`⚠️ [Watchdog] No price updates in last 30 seconds`);
        }
        
        resolve(pricesUpdating);
      } catch (parseError) {
        console.warn(`⚠️ [Watchdog] Could not parse price check result: ${parseError.message}`);
        console.warn(`⚠️ [Watchdog] Response was: ${stdout}`);
        resolve(true); // Assume healthy if we can't check
      }
    });
  });
}

// Function to start MT5 if it's not running
async function startMT5IfNeeded() {
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    const mt5Path = 'C:\\MT5_PriceFeeder\\terminal64.exe';
    
    console.log(`🔄 [Watchdog] Starting MT5: ${mt5Path}`);
    
    // Use cmd /c to properly execute the command
    exec(`cmd /c start "" "${mt5Path}"`, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ [Watchdog] Failed to start MT5: ${error.message}`);
        // Try alternative method
        exec(`powershell.exe -Command "& '${mt5Path}'"`, (error2, stdout2, stderr2) => {
          if (error2) {
            console.error(`❌ [Watchdog] Alternative MT5 start also failed: ${error2.message}`);
            resolve(false);
            return;
          }
          console.log(`✅ [Watchdog] MT5 start command executed (alternative method)`);
          setTimeout(() => {
            resolve(true);
          }, 5000);
        });
        return;
      }
      
      console.log(`✅ [Watchdog] MT5 start command executed`);
      // Wait longer for MT5 to initialize
      setTimeout(() => {
        resolve(true);
      }, 5000);
    });
  });
}

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

      // Check if prices are actually updating (check database for recent updates)
      checkPriceUpdates().then((pricesUpdating) => {
        if (!pricesUpdating) {
          console.warn(`⚠️ [Watchdog] Prices not updating in database - Price Feeder may be stuck`);
          // Don't resolve false yet - check MT5 first
        }

        // Check if MT5 process is running (Price Feeder needs MT5 to be running)
        const { exec } = require('child_process');
        exec('powershell.exe -Command "Get-Process terminal64 -ErrorAction SilentlyContinue | Where-Object { $_.Path -like \'*MT5_PriceFeeder*\' } | Measure-Object | Select-Object -ExpandProperty Count"', (error, stdout, stderr) => {
          if (error || !stdout || parseInt(stdout.trim()) === 0) {
            console.warn(`⚠️ [Watchdog] MT5 process not found - starting MT5...`);
            // Start MT5 if not running (async, don't wait)
            startMT5IfNeeded().then(() => {
              console.log(`✅ [Watchdog] MT5 started, will restart Price Feeder in next check`);
              // Restart Price Feeder after MT5 starts
              setTimeout(() => {
                pm2.restart(PRICE_FEEDER_NAME, (err) => {
                  if (err) {
                    console.error(`❌ [Watchdog] Failed to restart Price Feeder after MT5 start: ${err.message}`);
                  } else {
                    console.log(`✅ [Watchdog] Restarted Price Feeder after MT5 start`);
                  }
                });
              }, 8000); // Wait 8 seconds for MT5 to initialize and auto-login
            }).catch(err => {
              console.error(`❌ [Watchdog] Failed to start MT5: ${err.message}`);
            });
            // If MT5 is not running, mark as unhealthy
            resolve(false);
            return;
          }
          
          // If prices are not updating but MT5 is running, mark as unhealthy
          if (!pricesUpdating) {
            resolve(false);
            return;
          }
          
          // Everything is healthy
          resolve(true);
        });
      });
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
      
      // Wait a bit before considering it healthy (reduced for faster recovery)
      setTimeout(() => {
        resolve(true);
      }, 5000);
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
        
        // Try to start it
        pm2.start(PRICE_FEEDER_NAME, (err) => {
          if (err) {
            console.error(`❌ [Watchdog] Failed to start Price Feeder: ${err.message}`);
            console.log(`💡 [Watchdog] Price Feeder may need to be configured manually`);
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
          // Try to ensure it's at least running
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

// Connect to PM2
pm2.connect((err) => {
  if (err) {
    console.error(`❌ [Watchdog] Failed to connect to PM2: ${err.message}`);
    process.exit(1);
  }

  console.log(`✅ [Watchdog] Connected to PM2`);
  console.log(`🔍 [Watchdog] Starting Price Feeder monitoring...`);
  console.log(`⏱️  [Watchdog] Check interval: ${CHECK_INTERVAL / 1000}s`);

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


