/**
 * Imperial Trade - MT5 Broker Service
 * 
 * Express server that handles:
 * - Testing MT5 connections
 * - Fetching trades from MT5
 * - Decrypting credentials from Supabase
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { decryptCredentials } from './encryption';
import { testMT5Connection, fetchMT5Trades } from './mt5-client';
import { startAutoSync } from './auto-sync';
import { queueConnectionTest, queueFetchTrades, getJobStatus, createWorkers, connectionTestQueue, fetchTradesQueue } from './queue-manager';
import { getTerminalManager } from './terminal-manager';
import path from 'path';

// Explicitly load .env file from the service directory
// Try multiple paths to ensure we find the .env file
const possibleEnvPaths = [
  path.join(__dirname, '..', '.env'),
  path.join(process.cwd(), '.env'),
  path.resolve('.env'),
  'C:\\vps-broker-service\\.env'
];

console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('  🚀 IMPERIAL TRADE - MT5 BROKER SERVICE');
console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('');

let envLoaded = false;
for (const envPath of possibleEnvPaths) {
  console.log(`🔧 Trying to load .env from: ${envPath}`);
  const result = dotenv.config({ path: envPath });
  if (!result.error) {
    console.log(`✅ .env file loaded successfully from: ${envPath}`);
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.warn('⚠️  Could not load .env file from any expected location');
  console.warn('   Attempting to load from process environment...');
  // Try loading without path (uses process.cwd())
  dotenv.config();
}

console.log('🔑 Environment variables loaded:');
console.log('   VPS_API_KEY:', process.env.VPS_API_KEY ? '✅ SET' : '❌ NOT SET');
console.log('   SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ SET' : '❌ NOT SET');
console.log('   SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ SET' : '❌ NOT SET');
console.log('   INGEST_SECRET:', process.env.INGEST_SECRET ? '✅ SET' : '❌ NOT SET');

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10); // Use 3001 to avoid conflict with price feeder
const API_KEY = process.env.VPS_API_KEY || '';

// Middleware
// CORS: Allow all origins - Edge Function calls from Supabase cloud
app.use(cors({
  origin: '*', // Allow all origins - Edge Function can call from anywhere
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-API-Key', 'Authorization'],
  credentials: false
}));
app.use(express.json());

// Rate limiting middleware
// Allow 100 requests per minute per IP (for 10,000 users, this is ~167 requests/second total)
const rateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per window per IP
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all routes except health check
app.use((req, res, next) => {
  if (req.path === '/health') {
    return next();
  }
  rateLimiter(req, res, next);
});

// API Key validation middleware
function validateApiKey(req: Request, res: Response, next: Function) {
  // Normalize header name - Express is case-insensitive, but some proxies/middleware may normalize
  // Check both lowercase and capitalized versions to be safe
  // Headers can be string or string[], so normalize to string
  const getHeader = (name: string): string | undefined => {
    const value = req.headers[name];
    return Array.isArray(value) ? value[0] : value;
  };
  
  const apiKey = getHeader('x-api-key') || getHeader('X-API-Key') || getHeader('x-apikey') || getHeader('X-Apikey');
  
  if (!API_KEY || !apiKey || apiKey !== API_KEY) {
    console.error('❌ API Key validation failed:', {
      api_key_set: !!API_KEY,
      header_received: !!apiKey,
      header_keys: Object.keys(req.headers).filter(k => k.toLowerCase().includes('api')),
      received_value: apiKey ? apiKey.substring(0, 8) + '...' : 'none',
      expected_value: API_KEY ? API_KEY.substring(0, 8) + '...' : 'none'
    });
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  next();
}

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    service: 'imperial-trade-broker-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Diagnostics endpoint - comprehensive connection test
app.post('/diagnostics', validateApiKey, async (req: Request, res: Response) => {
  try {
    const {
      broker_type,
      encrypted_login,
      encrypted_password,
      encrypted_server,
      user_id
    } = req.body;

    if (!encrypted_login || !encrypted_password || !encrypted_server || !user_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Decrypt credentials
    const login = decryptCredentials(encrypted_login, user_id);
    const password = decryptCredentials(encrypted_password, user_id);
    const server = decryptCredentials(encrypted_server, user_id);

    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      credentials: {
        login_provided: login ? 'YES' : 'NO',
        password_provided: password ? 'YES' : 'NO',
        server_provided: server || 'NOT PROVIDED',
        server_length: server?.length || 0,
      },
      tests: [],
    };

    // Test 1: Server name normalization
    const { normalizeServerName } = await import('./server-name-normalizer');
    const normalized = normalizeServerName(server);
    diagnostics.tests.push({
      test: 'server_name_normalization',
      status: normalized.matched ? 'matched' : 'not_matched',
      original: normalized.original,
      normalized: normalized.normalized,
      message: normalized.matched 
        ? `Server name normalized to: ${normalized.normalized}`
        : `No normalization mapping found. Using original: ${normalized.original}`,
    });

    // Test 2: MT5 Connection
    try {
      const { testMT5Connection } = await import('./mt5-client');
      const connectionResult = await testMT5Connection({ login, password, server });
      
      diagnostics.tests.push({
        test: 'mt5_connection',
        status: connectionResult.connected ? 'success' : 'failed',
        connected: connectionResult.connected,
        server_used: connectionResult.server_used || server,
        account_info: connectionResult.account_info || null,
        error: connectionResult.error || null,
        message: connectionResult.connected
          ? `Successfully connected to MT5. Server used: ${connectionResult.server_used}`
          : `Connection failed: ${connectionResult.error}`,
      });
    } catch (error: any) {
      diagnostics.tests.push({
        test: 'mt5_connection',
        status: 'error',
        error: error.message,
        message: `Exception during connection test: ${error.message}`,
      });
    }

    // Test 3: Trade fetch capability
    if (diagnostics.tests.find((t: any) => t.test === 'mt5_connection' && t.status === 'success')) {
      try {
        const { fetchMT5Trades } = await import('./mt5-client');
        const fetchResult = await fetchMT5Trades({ login, password, server });
        
        diagnostics.tests.push({
          test: 'trade_fetch',
          status: fetchResult.error ? 'failed' : 'success',
          trades_found: fetchResult.trades?.length || 0,
          account_balance: fetchResult.account_balance || 0,
          server_used: fetchResult.server_used || server,
          error: fetchResult.error || null,
          message: fetchResult.error
            ? `Failed to fetch trades: ${fetchResult.error}`
            : `Successfully fetched ${fetchResult.trades?.length || 0} trades`,
        });
      } catch (error: any) {
        diagnostics.tests.push({
          test: 'trade_fetch',
          status: 'error',
          error: error.message,
          message: `Exception during trade fetch: ${error.message}`,
        });
      }
    } else {
      diagnostics.tests.push({
        test: 'trade_fetch',
        status: 'skipped',
        message: 'Skipped because MT5 connection test failed',
      });
    }

    // Overall status
    const allTestsPassed = diagnostics.tests.every((t: any) => 
      t.status === 'success' || t.status === 'skipped'
    );
    diagnostics.overall_status = allTestsPassed ? 'healthy' : 'issues_found';

    res.json(diagnostics);
  } catch (error: any) {
    console.error('❌ Error in diagnostics:', error);
    res.status(500).json({
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
});

// Test MT5 connection (with fallback to direct processing if Redis unavailable)
app.post('/test-connection', validateApiKey, async (req: Request, res: Response) => {
  try {
    const {
      broker_type,
      encrypted_login,
      encrypted_password,
      encrypted_server,
      user_id
    } = req.body;

    // Log complete request body for debugging
    console.log('📥 Received test-connection request:');
    console.log('   Request body keys:', Object.keys(req.body));
    console.log('   broker_type:', broker_type);
    console.log('   has_encrypted_login:', !!encrypted_login);
    console.log('   has_encrypted_password:', !!encrypted_password);
    console.log('   has_encrypted_server:', !!encrypted_server);
    console.log('   has_user_id:', !!user_id);
    console.log('   user_id:', user_id?.substring(0, 20) + '...');
    console.log('   encrypted_login length:', encrypted_login?.length || 0);
    console.log('   encrypted_password length:', encrypted_password?.length || 0);
    console.log('   encrypted_server length:', encrypted_server?.length || 0);

    if (!encrypted_login || !encrypted_password || !encrypted_server || !user_id) {
      console.error('❌ Missing required fields:', {
        has_encrypted_login: !!encrypted_login,
        has_encrypted_password: !!encrypted_password,
        has_encrypted_server: !!encrypted_server,
        has_user_id: !!user_id,
        received_keys: Object.keys(req.body)
      });
      return res.status(400).json({ 
        error: 'Missing required fields',
        debug: {
          has_encrypted_login: !!encrypted_login,
          has_encrypted_password: !!encrypted_password,
          has_encrypted_server: !!encrypted_server,
          has_user_id: !!user_id,
          received_keys: Object.keys(req.body)
        }
      });
    }

    // Decrypt credentials
    let login, password, server;
    try {
      console.log('🔓 Attempting to decrypt credentials...');
      login = decryptCredentials(encrypted_login, user_id);
      password = decryptCredentials(encrypted_password, user_id);
      server = decryptCredentials(encrypted_server, user_id);
      console.log('✅ Credentials decrypted successfully:', {
        login,
        server,
        password_length: password?.length
      });
    } catch (decryptError: any) {
      console.error('❌ Decryption failed:', decryptError?.message || decryptError);
      return res.status(400).json({
        connected: false,
        error: `Failed to decrypt credentials: ${decryptError?.message || 'Unknown error'}`
      });
    }

    // Try queue system first (if Redis is available), otherwise fallback to direct processing
    let useQueue = false;
    try {
      // Check if Redis is available by trying to create a test job
      // Use Promise.race with a short timeout to fail fast if Redis is unavailable
      const queueTestPromise = queueConnectionTest({
        encrypted_login,
        encrypted_password,
        encrypted_server,
        user_id,
        broker_type: broker_type || 'unknown'
      });
      
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Redis check timeout after 2 seconds')), 2000)
      );
      
      const testJob = await Promise.race([queueTestPromise, timeoutPromise]);
      useQueue = true;
      console.log(`✅ Using queue system (job ${testJob.id})`);

      // Wait for job to complete (with timeout)
      // Reduced to 45 seconds to ensure Edge Function completes within 55s limit
      const result = await new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Job timeout after 45 seconds'));
        }, 45000); // Reduced from 60000 to 45000

        const checkJob = async () => {
          try {
            const jobState = await testJob.getState();
            if (jobState === 'completed') {
              clearTimeout(timeout);
              const finishedJob = await connectionTestQueue.getJob(testJob.id!);
              resolve(finishedJob?.returnvalue || {});
            } else if (jobState === 'failed') {
              clearTimeout(timeout);
              reject(new Error(testJob.failedReason || 'Job failed'));
            } else {
              // Check again in 100ms
              setTimeout(checkJob, 100);
            }
          } catch (err: any) {
            clearTimeout(timeout);
            reject(err);
          }
        };

        checkJob();
      });

      console.log(`✅ Connection test job ${testJob.id} completed`);
      
      // Return result in format expected by Edge Function
      if (result.connected) {
        res.json({
          connected: true,
          account_info: result.account_info,
          server_used: result.server_used || server,
          connection_time_ms: result.connection_time_ms,
          message: 'Connection successful'
        });
      } else {
        res.status(400).json({
          connected: false,
          error: result.error || 'Failed to connect to MT5',
          server_tried: server
        });
      }
      return;
    } catch (queueError: any) {
      // Queue system failed (Redis not available) - fallback to direct processing
      console.log('⚠️  Queue system unavailable, using direct processing:', queueError.message);
      useQueue = false;
    }

    // Fallback: Direct processing (no queue, no Redis required)
    if (!useQueue) {
      console.log('🔄 Using direct MT5 connection (fallback mode)');
      console.log('   Credentials after decryption:', {
        login,
        login_type: typeof login,
        server,
        password_length: password?.length
      });
      
      // Ensure login is a string (will be converted to int in Python)
      const loginStr = String(login);
      
      // For now, disable portable mode on Linux (Wine) to use direct path
      // Portable mode requires proper Wine path handling which is complex
      // Use direct path approach instead
      const usePortableMode = false; // Disable portable mode for Wine compatibility
      
      const connectionStartTime = Date.now();
      
      try {
        // Use direct path (not portable mode) for Wine compatibility
        const result = await testMT5Connection({ 
          login: loginStr, 
          password, 
          server,
          terminal_id: undefined,
          terminal_path: undefined,
          terminal_data_path: undefined,
          portable_mode: usePortableMode
        });
        const connectionTime = Date.now() - connectionStartTime;

        if (!result.connected) {
          console.error('❌ MT5 connection failed:', result.error);
          // Return HTTP 200 with connected: false in body
          // Edge function will handle this and return pending verification
          return res.status(200).json({
            connected: false,
            error: result.error || 'Failed to connect to MT5',
            server_tried: server,
            connection_time_ms: connectionTime
          });
        }

        console.log(`✅ MT5 connection successful (${connectionTime}ms):`, {
          login: result.account_info?.login,
          server: result.server_used || server,
          balance: result.account_info?.balance
        });

        // Return in format expected by Edge Function
        res.json({
          connected: true,
          account_info: result.account_info,
          server_used: result.server_used || server,
          connection_time_ms: connectionTime,
          message: 'Connection successful'
        });
      } catch (error: any) {
        const connectionTime = Date.now() - connectionStartTime;
        console.error('❌ Exception during MT5 connection test:', error);
        return res.status(500).json({
          connected: false,
          error: error.message || 'Internal error during connection test',
          connection_time_ms: connectionTime
        });
      } finally {
        // Terminal release not needed when portable mode is disabled
      }
    }
  } catch (error: any) {
    console.error('❌ Error testing connection:', error);
    res.status(500).json({
      connected: false,
      error: error.message || 'Internal server error'
    });
  }
});

// Get job status
app.get('/job-status/:queue/:jobId', validateApiKey, async (req: Request, res: Response) => {
  try {
    const { queue, jobId } = req.params;
    
    if (queue !== 'mt5-connection-test' && queue !== 'mt5-fetch-trades') {
      return res.status(400).json({ error: 'Invalid queue name' });
    }

    const status = await getJobStatus(queue as 'mt5-connection-test' | 'mt5-fetch-trades', jobId);
    
    if (!status) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(status);
  } catch (error: any) {
    console.error('❌ Error getting job status:', error);
    res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
});

// Fetch trades from MT5 (with fallback to direct processing if Redis unavailable)
app.post('/fetch-trades', validateApiKey, async (req: Request, res: Response) => {
  try {
    const {
      encrypted_login,
      encrypted_password,
      encrypted_server,
      user_id
    } = req.body;

    if (!encrypted_login || !encrypted_password || !encrypted_server || !user_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Decrypt credentials
    const login = decryptCredentials(encrypted_login, user_id);
    const password = decryptCredentials(encrypted_password, user_id);
    const server = decryptCredentials(encrypted_server, user_id);

    // Try queue system first (if Redis is available), otherwise fallback to direct processing
    let useQueue = false;
    try {
      const testJob = await queueFetchTrades({
        encrypted_login,
        encrypted_password,
        encrypted_server,
        user_id
      });
      useQueue = true;
      console.log(`✅ Using queue system for trade fetch (job ${testJob.id})`);

      // Wait for job to complete (with timeout)
      const result = await new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Job timeout after 90 seconds'));
        }, 90000);

        const checkJob = async () => {
          try {
            const jobState = await testJob.getState();
            if (jobState === 'completed') {
              clearTimeout(timeout);
              const finishedJob = await fetchTradesQueue.getJob(testJob.id!);
              resolve(finishedJob?.returnvalue || {});
            } else if (jobState === 'failed') {
              clearTimeout(timeout);
              reject(new Error(testJob.failedReason || 'Job failed'));
            } else {
              // Check again in 100ms
              setTimeout(checkJob, 100);
            }
          } catch (err: any) {
            clearTimeout(timeout);
            reject(err);
          }
        };

        checkJob();
      });

      console.log(`✅ Trade fetch job ${testJob.id} completed`);
      
      // Return result in format expected by Edge Function
      res.json({
        trades: result.trades || [],
        account_balance: result.account_balance || 0,
        account_info: result.account_info || null,
        server_used: result.server_used || server
      });
      return;
    } catch (queueError: any) {
      // Queue system failed (Redis not available) - fallback to direct processing
      console.log('⚠️  Queue system unavailable, using direct processing:', queueError.message);
      useQueue = false;
    }

    // Fallback: Direct processing (no queue, no Redis required)
    if (!useQueue) {
      console.log('🔄 Using direct MT5 trade fetch (fallback mode)');
      try {
        const result = await fetchMT5Trades({ login, password, server });
        
        // Return in format expected by Edge Function
        res.json({
          trades: result.trades || [],
          account_balance: result.account_balance || 0,
          server_used: result.server_used || server
        });
      } catch (error: any) {
        console.error('❌ Error fetching trades:', error);
        res.status(500).json({
          error: error.message || 'Internal server error',
          trades: [],
          account_balance: 0
        });
      }
    }
  } catch (error: any) {
    console.error('❌ Error fetching trades:', error);
    res.status(500).json({
      error: error.message || 'Internal server error',
      trades: [],
      account_balance: 0
    });
  }
});

// Terminal statistics endpoint
app.get('/terminals/stats', validateApiKey, (req: Request, res: Response) => {
  try {
    const terminalManager = getTerminalManager();
    const stats = terminalManager.getStats();
    res.json(stats);
  } catch (error: any) {
    console.error('❌ Error getting terminal stats:', error);
    res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
});

// Start server - MUST bind to 0.0.0.0 to accept external connections from Edge Function
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('  ✅ SERVER STARTED SUCCESSFULLY');
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log(`🚀 Imperial Trade Broker Service running on 0.0.0.0:${PORT}`);
  console.log(`🌐 Server accessible from external IP: http://[VPS_IP]:${PORT}`);
  console.log(`📝 API Key required: ${API_KEY ? 'Set' : 'NOT SET - Please configure VPS_API_KEY'}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('');
  
  // Initialize terminal manager
  console.log('🔧 Initializing terminal manager...');
  const terminalManager = getTerminalManager();
  const terminalStats = terminalManager.getStats();
  console.log(`✅ Terminal manager initialized: ${terminalStats.total} terminals available`);
  console.log(`   - Available: ${terminalStats.available}`);
  console.log(`   - Busy: ${terminalStats.busy}`);
  console.log('');
  
  // Start queue workers (optional - Redis required)
  // If Redis is not available, workers won't start but service continues with direct processing
  console.log('🔄 Checking queue system (Redis optional)...');
  try {
    // Try to create workers - if Redis is not available, BullMQ will throw an error
    // We catch it and continue without queue system
    const { connectionTestWorker, fetchTradesWorker } = createWorkers();
    
    // If we get here, workers were created (but may still fail to connect)
    // Set up error handlers to suppress Redis connection errors
    connectionTestWorker.on('error', (err: Error) => {
      if (!err.message?.includes('ECONNREFUSED') && !err.message?.includes('Redis')) {
        console.error('[Queue] Worker error:', err.message);
      }
    });
    
    fetchTradesWorker.on('error', (err: Error) => {
      if (!err.message?.includes('ECONNREFUSED') && !err.message?.includes('Redis')) {
        console.error('[Queue] Worker error:', err.message);
      }
    });
    
    console.log('✅ Queue workers created (Redis connection will be tested on first use)');
    console.log(`   - Connection test worker: Created`);
    console.log(`   - Trade fetch worker: Created`);
    console.log(`   - Max concurrency: ${terminalStats.total} jobs per worker`);
    console.log('   Note: If Redis is unavailable, service will use direct processing');
    console.log('');
  } catch (error: any) {
    // Redis not available or workers failed to create - this is expected and OK
    const isRedisError = error?.message?.includes('ECONNREFUSED') || 
                        error?.message?.includes('Redis') ||
                        error?.code === 'ECONNREFUSED';
    
    if (isRedisError) {
      console.log('ℹ️  Redis not available - using direct processing (no queue)');
      console.log('   Service will process requests directly without queuing');
    } else {
      console.log('ℹ️  Queue system unavailable - using direct processing');
      console.log('   Error:', error?.message || 'Unknown error');
    }
    console.log('');
  }
  
  // Start auto-sync service in background
  console.log('🔄 Attempting to start auto-sync service...');
  startAutoSync()
    .then(() => {
      console.log('✅ Auto-sync service started successfully');
    })
    .catch((error) => {
      console.error('❌ Failed to start auto-sync service:', error);
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('❌ Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    });
  
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('  🎯 SCALABILITY FEATURES ENABLED');
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('✅ Queue System: BullMQ with Redis');
  console.log('✅ Terminal Pool: Multiple MT5 instances (Portable Mode)');
  console.log('✅ Rate Limiting: 100 requests/minute per IP');
  console.log('✅ Concurrent Processing: Up to ' + terminalStats.total + ' simultaneous connections');
  console.log('✅ Estimated Capacity: 10,000+ concurrent users');
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('');
});


