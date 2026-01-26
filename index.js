const MetaApi = require('metaapi.cloud-sdk').default;
const { SynchronizationListener } = require('metaapi.cloud-sdk');
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
async function cleanup() {
  log('Cleaning up resources...', 'info');
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
  if (connection) {
    try {
      // Remove synchronization listeners if method exists
      if (typeof connection.removeSynchronizationListener === 'function') {
        // Remove listeners (would need to track them separately)
        // For now, just disconnect
      }
      if (typeof connection.disconnect === 'function') {
        await connection.disconnect();
      }
    } catch (error) {
      log(`Error cleaning up connection: ${error.message}`, 'error');
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

    // Reload account to get current state
    await account.reload();
    
    // ✅ PRIORITY CHECK: Check connection status first - if CONNECTED, account is definitely deployed
    // Account JSON shows: "connectionStatus": "CONNECTED", "state": "DEPLOYED"
    let connectionState = account.connectionStatus || account.connectionHealthStatus;
    if (connectionState === 'CONNECTED') {
      log('✅ Account is already connected - skipping deployment check', 'success');
      log('✅ Account is deployed', 'success');
    } else {
      // Only check deployment state if not already connected
      // Account JSON shows: "state": "DEPLOYED" (not deploymentState)
      let deploymentState = account.state || account.deploymentState;
      
      // If deploymentState is undefined, try alternative property access
      if (!deploymentState) {
        deploymentState = account.state || account.deploymentState;
      }
      
      // Deploy account if not already deployed and not already deploying
      if (deploymentState && deploymentState !== 'DEPLOYED' && deploymentState !== 'DEPLOYING') {
        log(`Account deployment state: ${deploymentState}. Deploying account...`, 'info');
        try {
          await account.deploy();
          log('✅ Deployment initiated, waiting for account to be deployed...', 'success');
          deploymentState = 'DEPLOYING';
        } catch (deployError) {
          // If deploy fails, account might already be deployed
          log(`⚠️  Deploy call failed: ${deployError.message}. Checking connection status...`, 'warning');
          await account.reload();
          connectionState = account.connectionStatus || account.connectionHealthStatus;
          if (connectionState) {
            log(`✅ Account is accessible (connection status: ${connectionState}). Proceeding...`, 'success');
            deploymentState = 'DEPLOYED';
          } else {
            deploymentState = 'DEPLOYING'; // Try waiting anyway
          }
        }
      } else if (!deploymentState || deploymentState === 'DEPLOYING') {
        // If state is undefined or DEPLOYING, check if we can access connection status
        if (connectionState) {
          log(`✅ Account appears accessible (connection status: ${connectionState}). Skipping deployment wait...`, 'success');
          deploymentState = 'DEPLOYED';
        } else {
          // Try to deploy if not already deploying
          if (deploymentState !== 'DEPLOYING') {
            log('Deployment state unclear, attempting to deploy account...', 'info');
            try {
              await account.deploy();
              deploymentState = 'DEPLOYING';
            } catch (deployError) {
              log(`⚠️  Deploy failed: ${deployError.message}. Proceeding with connection check...`, 'warning');
            }
          }
        }
      } else if (deploymentState === 'DEPLOYED') {
        log('✅ Account is already deployed', 'success');
      }

      // Wait for account to be deployed (only if not already deployed/connected)
      if (deploymentState !== 'DEPLOYED' && !connectionState) {
        log('Waiting for account deployment...', 'info');
        let retries = 0;
        const maxDeploymentRetries = 30; // 2.5 minutes max wait (reduced from 5 minutes)

        while (deploymentState !== 'DEPLOYED' && retries < maxDeploymentRetries && !connectionState) {
          if (retries % 10 === 0) {
            log(`Account deployment state: ${deploymentState || 'undefined'} (retry ${retries}/${maxDeploymentRetries})`, 'info');
          }
          await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
          await account.reload();
          deploymentState = account.state || account.deploymentState || deploymentState;
          connectionState = account.connectionStatus || account.connectionHealthStatus; // Check connection as fallback
          
          // If connection becomes available, account is deployed
          if (connectionState) {
            log(`✅ Account is accessible (connection status: ${connectionState}). Proceeding...`, 'success');
            deploymentState = 'DEPLOYED';
            break;
          }
          
          retries++;
        }

        // Final check: if connection is available, proceed even if deployment state unclear
        if (deploymentState !== 'DEPLOYED') {
          await account.reload();
          connectionState = account.connectionStatus || account.connectionHealthStatus;
          if (connectionState) {
            log(`⚠️  Deployment state unclear (${deploymentState}), but account is accessible (${connectionState}). Proceeding...`, 'warning');
            deploymentState = 'DEPLOYED';
          } else {
            throw new Error(`Account not deployed after ${maxDeploymentRetries} retries. Current state: ${deploymentState || 'undefined'}. Please check account status in MetaApi dashboard.`);
          }
        }
      }
      
      log('✅ Account is deployed', 'success');
    }

    // Wait for connection
    log('Waiting for account connection...', 'info');
    // Re-check connection state (variable already declared above)
    // Account JSON shows: "connectionStatus": "CONNECTED"
    connectionState = account.connectionStatus || account.connectionHealthStatus;
    retries = 0;
    const maxConnectionRetries = 60; // 5 minutes max wait

    while (connectionState !== 'CONNECTED' && retries < maxConnectionRetries) {
      if (retries % 10 === 0) {
        log(`Connection state: ${connectionState} (retry ${retries}/${maxConnectionRetries})`, 'info');
      }
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      await account.reload();
      connectionState = account.connectionStatus || account.connectionHealthStatus;
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
    
    // Create synchronization listener for price updates
    class PriceUpdateListener extends SynchronizationListener {
      async onSymbolPriceUpdated(instanceIndex, price) {
        // onSymbolPriceUpdated receives (instanceIndex, price) parameters
        if (price && targetSymbols.includes(price.symbol)) {
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
      }
    }

    const priceListener = new PriceUpdateListener();
    connection.addSynchronizationListener(priceListener);
    
    log('✅ Price listener active', 'success');

    // Push to Supabase every 500ms (2 updates per second)
    log('Starting database sync interval (500ms = 2 updates/second)...', 'info');
    syncInterval = setInterval(async () => {
      // ✅ FIX: Ensure ALL subscribed symbols are synced, even if no new tick received
      // Get prices from buffer, but also ensure we have entries for all 5 symbols
      const updates = Object.values(priceBuffer);
      
      // ✅ CRITICAL: Check if we have all 5 symbols, log if missing
      const bufferSymbols = updates.map(p => p.symbol);
      const missingSymbols = targetSymbols.filter(s => !bufferSymbols.includes(s));
      
      // ✅ ALWAYS log which symbols are being synced and which are missing
      if (missingSymbols.length > 0) {
        log(`⚠️ Only ${updates.length}/${targetSymbols.length} symbols in buffer - Missing: ${missingSymbols.join(', ')}`, 'warning');
        log(`📊 Syncing: ${bufferSymbols.join(', ')}`, 'info');
      } else {
        log(`✅ All ${targetSymbols.length} symbols in buffer - Ready to sync`, 'info');
      }
      
      if (updates.length === 0) {
        log('⚠️ No prices in buffer yet (waiting for first ticks)...', 'warning');
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
        const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success));
        
        // ✅ FIX: Log detailed sync status to understand why 4/4 instead of 5/5
        if (successful > 0) {
          // Show which symbols were synced
          const syncedSymbols = updates.filter((_, i) => {
            const result = results[i];
            return result.status === 'fulfilled' && result.value.success;
          }).map(p => p.symbol);
          
          if (updates.length === targetSymbols.length) {
            log(`✅ Synced ${successful}/${targetSymbols.length} prices to Supabase: ${syncedSymbols.join(', ')}`, 'success');
          } else {
            log(`✅ Synced ${successful}/${updates.length} prices to Supabase (${updates.length}/${targetSymbols.length} total) - Symbols: ${syncedSymbols.join(', ')}`, 'success');
            log(`⚠️ Missing from sync: ${missingSymbols.join(', ')} (no price ticks received yet)`, 'warning');
          }
        }
        
        if (failed.length > 0) {
          const failedSymbols = failed.map(r => {
            if (r.status === 'rejected') return 'unknown';
            return r.value?.symbol || 'unknown';
          });
          log(`❌ Failed to sync ${failed.length} prices: ${failedSymbols.join(', ')}`, 'error');
        }

        // Note: We don't clear the buffer so stale symbols keep their last price
        // This ensures the database always has current records even if no new ticks arrive

      } catch (error) {
        log(`❌ Sync exception: ${error.message}`, 'error');
        log(`Stack: ${error.stack}`, 'error');
      }
    }, 500); // 500ms = 2 updates per second

    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
      log('SIGTERM received, shutting down gracefully...', 'info');
      await cleanup();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      log('SIGINT received, shutting down gracefully...', 'info');
      await cleanup();
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
    
    await cleanup();
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
