# ✅ NEW DigitalOcean Worker Code - index.js

## Repository: https://github.com/Imperial-Trade/imperial-trade-ingress-worker

## ⚠️ CURRENT ISSUE

The GitHub repository currently has the **OLD** architecture:
- ❌ Uses TraderMade WebSocket
- ❌ Calls Edge Function via axios
- ❌ 1 second batch interval
- ❌ Uses `SUPABASE_EDGE_FUNCTION_URL`

## ✅ NEW ARCHITECTURE REQUIRED

The repository needs the **NEW** architecture:
- ✅ Uses MetaApi SDK
- ✅ Direct Supabase database writes via RPC
- ✅ 500ms batch interval (2 updates/second)
- ✅ Uses `SUPABASE_SERVICE_ROLE_KEY` for direct database access

---

## Complete NEW index.js Code

Replace the entire `index.js` file in the GitHub repository with this code:

```javascript
const MetaApi = require('metaapi.cloud-sdk').default;
const { createClient } = require('@supabase/supabase-js');

// Environment variables (set in DO App Settings > Variables)
const token = process.env.META_API_TOKEN;
const accountId = process.env.META_API_ACCOUNT_ID;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required env vars with detailed error reporting
const missingVars = [];
if (!token) missingVars.push('META_API_TOKEN');
if (!accountId) missingVars.push('META_API_ACCOUNT_ID');
if (!supabaseUrl) missingVars.push('SUPABASE_URL');
if (!supabaseKey) missingVars.push('SUPABASE_SERVICE_ROLE_KEY');

if (missingVars.length > 0) {
  console.error('❌ FATAL ERROR: Missing required environment variables!');
  console.error(`Missing variables: ${missingVars.join(', ')}`);
  console.error('');
  console.error('Please set these in DigitalOcean App Settings > Variables:');
  console.error('1. META_API_TOKEN');
  console.error('2. META_API_ACCOUNT_ID');
  console.error('3. SUPABASE_URL');
  console.error('4. SUPABASE_SERVICE_ROLE_KEY');
  console.error('');
  console.error('After setting variables, restart the worker or trigger a redeploy.');
  process.exit(1);
}

// Initialize clients
const api = new MetaApi(token);
const supabase = createClient(supabaseUrl, supabaseKey);

// Target symbols (5 assets - matches Pattern Stream UI)
const targetSymbols = ['XAUUSD', 'BTCUSD', 'U30USD', 'SPXUSD', 'NDXUSD'];

// Price buffer (stores latest tick in memory - 500ms throttle)
let priceBuffer = {};

// Connection state
let connection = null;
let isRunning = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
let syncInterval = null;

// Logging helper
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : '📊';
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

// Cleanup function
function cleanup() {
  log('Cleaning up resources...', 'info');
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
  if (connection) {
    try {
      connection.removeAllListeners();
    } catch (error) {
      log(`Error removing listeners: ${error.message}`, 'error');
    }
  }
  isRunning = false;
}

// Start the price ingestor
async function start() {
  if (isRunning) {
    log('Worker already running, skipping start', 'warning');
    return;
  }

  isRunning = true;
  log('🚀 Starting MetaApi Price Ingestor for DigitalOcean...', 'info');
  log(`Target symbols: ${targetSymbols.join(', ')}`, 'info');

  try {
    // Get MetaApi account
    log(`Fetching MetaApi account: ${accountId}`, 'info');
    const account = await api.metatraderAccountApi.getAccount(accountId);
    
    if (!account) {
      throw new Error(`Account ${accountId} not found`);
    }

    // Wait for account to be deployed
    log('Waiting for account deployment...', 'info');
    let deploymentState = account.deploymentState;
    let retries = 0;
    const maxDeploymentRetries = 60; // 5 minutes max wait

    while (deploymentState !== 'DEPLOYED' && retries < maxDeploymentRetries) {
      if (retries % 10 === 0) {
        log(`Account deployment state: ${deploymentState} (retry ${retries}/${maxDeploymentRetries})`, 'info');
      }
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      await account.reload();
      deploymentState = account.deploymentState;
      retries++;
    }

    if (deploymentState !== 'DEPLOYED') {
      throw new Error(`Account not deployed after ${maxDeploymentRetries} retries. Current state: ${deploymentState}`);
    }

    log('✅ Account is deployed', 'success');

    // Wait for connection
    log('Waiting for account connection...', 'info');
    let connectionState = account.connectionHealthStatus;
    retries = 0;
    const maxConnectionRetries = 60; // 5 minutes max wait

    while (connectionState !== 'CONNECTED' && retries < maxConnectionRetries) {
      if (retries % 10 === 0) {
        log(`Connection state: ${connectionState} (retry ${retries}/${maxConnectionRetries})`, 'info');
      }
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      await account.reload();
      connectionState = account.connectionHealthStatus;
      retries++;
    }

    if (connectionState !== 'CONNECTED') {
      throw new Error(`Account not connected after ${maxConnectionRetries} retries. Current state: ${connectionState}`);
    }

    log('✅ Account is connected', 'success');

    // Get streaming connection
    log('Creating streaming connection...', 'info');
    connection = account.getStreamingConnection();
    
    // Wait for synchronization
    log('Waiting for synchronization...', 'info');
    await connection.connect();
    
    try {
      await connection.waitSynchronized({ timeoutInSeconds: 300 });
      log('✅ Stream synchronized', 'success');
    } catch (syncError) {
      log(`⚠️ Synchronization timeout, proceeding anyway: ${syncError.message}`, 'warning');
    }

    // Subscribe to all target symbols
    log(`Subscribing to ${targetSymbols.length} symbols...`, 'info');
    const subscriptionPromises = targetSymbols.map(async (symbol) => {
      try {
        await connection.subscribeToMarketData(symbol);
        log(`✅ Subscribed to ${symbol}`, 'success');
        return { success: true, symbol };
      } catch (error) {
        log(`❌ Failed to subscribe to ${symbol}: ${error.message}`, 'error');
        return { success: false, symbol, error: error.message };
      }
    });

    const subscriptionResults = await Promise.all(subscriptionPromises);
    const successfulSubs = subscriptionResults.filter(r => r.success);
    log(`Subscribed to ${successfulSubs.length}/${targetSymbols.length} symbols`, 'info');

    if (successfulSubs.length === 0) {
      throw new Error('Failed to subscribe to any symbols');
    }

    // Listen for price ticks and save to memory buffer
    log('Setting up price tick listener...', 'info');
    connection.terminalState.on('price', (price) => {
      if (targetSymbols.includes(price.symbol)) {
        // Calculate mid price if both bid/ask available
        const mid = price.bid && price.ask 
          ? (parseFloat(price.bid) + parseFloat(price.ask)) / 2 
          : (price.bid || price.ask || null);

        priceBuffer[price.symbol] = {
          symbol: price.symbol,
          bid: price.bid ? parseFloat(price.bid) : null,
          ask: price.ask ? parseFloat(price.ask) : null,
          mid: mid ? parseFloat(mid) : null,
          timestamp: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }
    });

    log('✅ Price listener active', 'success');

    // Push to Supabase every 500ms (2 updates per second)
    log('Starting database sync interval (500ms = 2 updates/second)...', 'info');
    syncInterval = setInterval(async () => {
      const updates = Object.values(priceBuffer);
      
      if (updates.length === 0) {
        return; // No prices to update
      }

      try {
        // Prepare upsert data matching your market_prices table schema
        const upsertData = updates.map(price => ({
          symbol: price.symbol,
          bid: price.bid,
          ask: price.ask,
          mid: price.mid,
          timestamp: price.timestamp,
          updated_at: price.updated_at,
          source: 'metaapi' // Track source
        }));

        // Direct database upsert (faster than Edge Function)
        // Uses your existing upsert_market_price_enhanced RPC function
        const upsertPromises = upsertData.map(async (priceData) => {
          try {
            const { error } = await supabase.rpc('upsert_market_price_enhanced', {
              p_symbol: priceData.symbol,
              p_bid: priceData.bid,
              p_ask: priceData.ask,
              p_mid: priceData.mid,
              p_timestamp: priceData.timestamp
            });

            if (error) {
              log(`❌ DB upsert error for ${priceData.symbol}: ${error.message}`, 'error');
              return { success: false, symbol: priceData.symbol, error: error.message };
            }
            return { success: true, symbol: priceData.symbol };
          } catch (error) {
            log(`❌ DB upsert exception for ${priceData.symbol}: ${error.message}`, 'error');
            return { success: false, symbol: priceData.symbol, error: error.message };
          }
        });

        const results = await Promise.allSettled(upsertPromises);
        const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
        
        if (successful > 0) {
          log(`✅ Synced ${successful}/${updates.length} prices to Supabase`, 'success');
        }

        // Note: We don't clear the buffer so stale symbols keep their last price
        // This ensures the database always has current records even if no new ticks arrive

      } catch (error) {
        log(`❌ Sync exception: ${error.message}`, 'error');
        log(`Stack: ${error.stack}`, 'error');
      }
    }, 500); // 500ms = 2 updates per second

    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      log('SIGTERM received, shutting down gracefully...', 'info');
      cleanup();
      process.exit(0);
    });

    process.on('SIGINT', () => {
      log('SIGINT received, shutting down gracefully...', 'info');
      cleanup();
      process.exit(0);
    });

    // Success - reset reconnect attempts
    reconnectAttempts = 0;
    log('🚀 Price ingestor running successfully!', 'success');
    log(`📊 Syncing prices to Supabase every 500ms (${targetSymbols.length} symbols)`, 'info');

  } catch (error) {
    log(`❌ Fatal error: ${error.message}`, 'error');
    if (error.stack) {
      log(`Stack: ${error.stack}`, 'error');
    }
    
    cleanup();
    isRunning = false;
    reconnectAttempts++;

    // Auto-restart on crash (with exponential backoff)
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      const delay = Math.min(5000 * Math.pow(1.5, reconnectAttempts), 60000); // Max 60 seconds
      log(`🔄 Auto-restarting in ${Math.round(delay / 1000)} seconds (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`, 'warning');
      setTimeout(() => {
        start();
      }, delay);
    } else {
      log(`❌ Max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Worker stopped.`, 'error');
      process.exit(1);
    }
  }
}

// Export for DigitalOcean App Platform
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { start };
  
  // If running as a worker, start immediately
  if (process.env.DO_APP_WORKER || process.env.NODE_ENV !== 'test') {
    start();
  }
}

// Start the ingestor
start();
```

---

## Key Differences: OLD vs NEW

| Feature | OLD (Current in GitHub) | NEW (Required) |
|---------|-------------------------|----------------|
| **Data Source** | TraderMade WebSocket | MetaApi SDK |
| **Connection** | WebSocket + axios | MetaApi Streaming Connection |
| **Database Write** | Edge Function (axios.post) | Direct RPC (supabase.rpc) |
| **Interval** | 1000ms (1 second) | 500ms (0.5 seconds) |
| **Dependencies** | WebSocket, axios | metaapi.cloud-sdk, @supabase/supabase-js |
| **Environment Vars** | TRADERMADE_WS_URL, SUPABASE_EDGE_FUNCTION_URL | META_API_TOKEN, META_API_ACCOUNT_ID |
| **Function Called** | Edge Function endpoint | `upsert_market_price_enhanced` RPC |

---

## package.json (NEW)

Replace `package.json` with:

```json
{
  "name": "imperial-ingress-worker",
  "version": "2.0.0",
  "description": "High-frequency MetaApi to Supabase price ingestor (2 updates/second)",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "node index.js"
  },
  "dependencies": {
    "metaapi.cloud-sdk": "^21.0.0",
    "@supabase/supabase-js": "^2.39.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

---

## Steps to Update GitHub Repository

1. **Go to:** https://github.com/Imperial-Trade/imperial-trade-ingress-worker
2. **Edit `index.js`:**
   - Click on `index.js`
   - Click "Edit" (pencil icon)
   - Replace ALL content with the NEW code above
   - Commit message: "feat: migrate to MetaApi with direct RPC writes (500ms interval)"
   - Click "Commit changes"

3. **Edit `package.json`:**
   - Click on `package.json`
   - Click "Edit" (pencil icon)
   - Replace with the NEW package.json above
   - Commit message: "chore: update dependencies for MetaApi architecture"
   - Click "Commit changes"

4. **Verify Environment Variables in DigitalOcean:**
   - Go to DigitalOcean Dashboard
   - App Settings → Variables
   - Ensure these are set:
     - `META_API_TOKEN`
     - `META_API_ACCOUNT_ID = 4158f3d7-08b5-4e23-9202-18ef753aabe1`
     - `SUPABASE_URL = https://kmuoqkcxguafxulqlbmi.supabase.co`
     - `SUPABASE_SERVICE_ROLE_KEY`

5. **Deploy:**
   - DigitalOcean will auto-deploy after GitHub push
   - Or manually trigger deployment in DigitalOcean dashboard

---

## Verification After Update

After updating the GitHub repository:

1. ✅ Check DigitalOcean Runtime Logs
2. ✅ Verify worker starts successfully
3. ✅ Verify MetaApi connection established
4. ✅ Verify prices writing to `market_prices` table
5. ✅ Verify frontend displays live prices

---

## Status

- [ ] GitHub repository updated with NEW code
- [ ] package.json updated with NEW dependencies
- [ ] Environment variables verified in DigitalOcean
- [ ] Worker deployed and running
- [ ] Live prices displaying in frontend
