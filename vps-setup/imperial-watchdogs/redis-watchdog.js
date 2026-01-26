/**
 * Redis Watchdog - Auto-Restart for Broker Service
 * 
 * Monitors Redis and restarts it if it stops
 * Ensures broker service queue system always has Redis available
 */

const { exec } = require('child_process');
const fs = require('fs');

const REDIS_SERVER_PATH = 'C:\\Redis\\redis-server.exe';
const CHECK_INTERVAL = 10000; // Check every 10 seconds
const RESTART_COOLDOWN = 30000; // 30 seconds cooldown between restart attempts

let lastRestartTime = 0;
let consecutiveFailures = 0;
const MAX_CONSECUTIVE_FAILURES = 3;

/**
 * Check if Redis process is running
 */
function isRedisRunning() {
  return new Promise((resolve) => {
    exec('powershell.exe -Command "Get-Process redis-server -ErrorAction SilentlyContinue | Measure-Object | Select-Object -ExpandProperty Count"', (error, stdout, stderr) => {
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
 * Check if Redis is listening on port 6379
 */
function isRedisListening() {
  return new Promise((resolve) => {
    exec('netstat -ano | findstr ":6379" | findstr "LISTENING"', (error, stdout, stderr) => {
      if (error || !stdout || stdout.trim().length === 0) {
        resolve(false);
        return;
      }
      resolve(true);
    });
  });
}

/**
 * Test Redis connection
 */
function testRedisConnection() {
  return new Promise((resolve) => {
    const redisCli = 'C:\\Redis\\redis-cli.exe';
    if (!fs.existsSync(redisCli)) {
      resolve(false);
      return;
    }
    
    exec(`"${redisCli}" ping`, { timeout: 5000 }, (error, stdout, stderr) => {
      if (error) {
        resolve(false);
        return;
      }
      
      const result = stdout.trim().toUpperCase();
      resolve(result === 'PONG');
    });
  });
}

/**
 * Start Redis server
 */
function startRedis() {
  return new Promise((resolve) => {
    const now = Date.now();
    
    // Cooldown check
    if (now - lastRestartTime < RESTART_COOLDOWN) {
      const waitTime = RESTART_COOLDOWN - (now - lastRestartTime);
      console.log(`⏳ [Redis Watchdog] Cooldown: ${Math.round(waitTime / 1000)}s remaining`);
      resolve(false);
      return;
    }
    
    if (!fs.existsSync(REDIS_SERVER_PATH)) {
      console.error(`❌ [Redis Watchdog] Redis server not found at: ${REDIS_SERVER_PATH}`);
      resolve(false);
      return;
    }
    
    lastRestartTime = now;
    console.log(`🔄 [Redis Watchdog] Starting Redis server...`);
    
    // Start Redis in background - use cmd /c start for reliability
    exec(`cmd /c start "" "${REDIS_SERVER_PATH}"`, (error, stdout, stderr) => {
      if (error) {
        // Try alternative method
        exec(`powershell.exe -Command "Start-Process -FilePath '${REDIS_SERVER_PATH}' -WindowStyle Hidden"`, (error2, stdout2, stderr2) => {
          if (error2) {
            console.error(`❌ [Redis Watchdog] Failed to start Redis: ${error2.message}`);
            resolve(false);
            return;
          }
          
          console.log(`✅ [Redis Watchdog] Redis start command executed (PowerShell method)`);
          checkRedisAfterStart(resolve);
        });
        return;
      }
      
      console.log(`✅ [Redis Watchdog] Redis start command executed (cmd method)`);
      checkRedisAfterStart(resolve);
    });
  });
}

/**
 * Check Redis after start (helper function)
 */
function checkRedisAfterStart(resolve) {
  // Wait for Redis to initialize
  setTimeout(async () => {
    const isRunning = await isRedisRunning();
    const isListening = await isRedisListening();
    const isConnected = await testRedisConnection();
    
    if (isRunning && isListening && isConnected) {
      console.log(`✅ [Redis Watchdog] Redis started successfully`);
      
      // Configure for 10,000 concurrency
      configureRedis();
      
      resolve(true);
    } else {
      console.warn(`⚠️ [Redis Watchdog] Redis started but not fully ready (running: ${isRunning}, listening: ${isListening}, connected: ${isConnected})`);
      // Still resolve true if process is running
      if (isRunning) {
        configureRedis();
        resolve(true);
      } else {
        resolve(false);
      }
    }
  }, 5000);
}

/**
 * Configure Redis for 10,000 concurrency
 */
function configureRedis() {
  const redisCli = 'C:\\Redis\\redis-cli.exe';
  if (!fs.existsSync(redisCli)) {
    return;
  }
  
  console.log(`⚙️ [Redis Watchdog] Configuring Redis for 10,000 concurrency...`);
  
  exec(`"${redisCli}" CONFIG SET maxclients 10000`, (error) => {
    if (!error) {
      console.log(`✅ [Redis Watchdog] Set maxclients to 10,000`);
    }
  });
  
  exec(`"${redisCli}" CONFIG SET maxmemory 2147483648`, (error) => {
    if (!error) {
      console.log(`✅ [Redis Watchdog] Set maxmemory to 2GB`);
    }
  });
  
  exec(`"${redisCli}" CONFIG SET maxmemory-policy allkeys-lru`, (error) => {
    if (!error) {
      console.log(`✅ [Redis Watchdog] Set memory policy`);
    }
  });
}

/**
 * Check Redis health
 */
async function checkRedisHealth() {
  const isRunning = await isRedisRunning();
  const isListening = await isRedisListening();
  const isConnected = await testRedisConnection();
  
  return {
    healthy: isRunning && isListening && isConnected,
    details: {
      processRunning: isRunning,
      portListening: isListening,
      connectionWorking: isConnected
    }
  };
}

/**
 * Main monitoring loop
 */
async function monitorRedis() {
  try {
    const health = await checkRedisHealth();
    
    if (!health.healthy) {
      consecutiveFailures++;
      console.warn(`⚠️ [Redis Watchdog] Redis unhealthy (failures: ${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES})`);
      console.warn(`   Details:`, health.details);
      
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        console.error(`❌ [Redis Watchdog] Too many failures, attempting restart...`);
        
        const restarted = await startRedis();
        
        if (restarted) {
          consecutiveFailures = 0;
          console.log(`✅ [Redis Watchdog] Redis restored after restart`);
        } else {
          console.error(`❌ [Redis Watchdog] Failed to restart Redis`);
        }
      }
    } else {
      if (consecutiveFailures > 0) {
        console.log(`✅ [Redis Watchdog] Redis is healthy again (recovered from ${consecutiveFailures} failures)`);
        consecutiveFailures = 0;
      }
    }
  } catch (error) {
    console.error(`❌ [Redis Watchdog] Health check error: ${error.message}`);
    consecutiveFailures++;
  }
}

// Start monitoring
console.log(`✅ [Redis Watchdog] Starting Redis monitoring...`);
console.log(`⏱️  [Redis Watchdog] Check interval: ${CHECK_INTERVAL / 1000}s`);
console.log(`🔄 [Redis Watchdog] Monitoring Redis at: ${REDIS_SERVER_PATH}`);

// Initial check
monitorRedis();

// Periodic checks
setInterval(monitorRedis, CHECK_INTERVAL);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log(`\n🛑 [Redis Watchdog] Shutting down...`);
  process.exit(0);
});
