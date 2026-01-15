/**
 * Queue Manager for MT5 Operations
 * 
 * Uses BullMQ to handle concurrent MT5 connection requests.
 * This prevents the "One Terminal" bottleneck by queuing requests
 * and processing them sequentially per terminal instance.
 * 
 * Architecture:
 * - Connection test requests go to 'mt5-connection-test' queue
 * - Trade fetch requests go to 'mt5-fetch-trades' queue
 * - Each queue has multiple workers (one per terminal instance)
 * - Workers process jobs sequentially to avoid terminal conflicts
 */

import { Queue, Worker, Job } from 'bullmq';
import { getTerminalManager, TerminalManager } from './terminal-manager';
import { decryptCredentials } from './encryption';
import { spawn } from 'child_process';
import path from 'path';

// Redis connection configuration
// NOTE: Redis is optional - service falls back to direct processing if Redis is unavailable
const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Required for BullMQ
  // Suppress connection errors - Redis is optional
  enableOfflineQueue: false, // Don't queue commands when offline
  retryStrategy: () => null, // Don't retry - fail fast and fallback to direct processing
};

// Stagger login attempts to prevent broker bans (milliseconds)
// Default: 500ms = 2 logins/second max (safe for most brokers)
// Increase to 1000ms (1/second) or 2000ms (0.5/second) if broker bans occur
const LOGIN_DELAY_MS = parseInt(process.env.LOGIN_DELAY_MS || '500', 10);

// Queue configurations
export const connectionTestQueue = new Queue('mt5-connection-test', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000, // 2s, 4s, 8s
    },
    removeOnComplete: {
      age: 3600, // Keep completed jobs for 1 hour
      count: 1000, // Keep last 1000 jobs
    },
    removeOnFail: {
      age: 86400, // Keep failed jobs for 24 hours
    },
  },
});

export const fetchTradesQueue = new Queue('mt5-fetch-trades', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 3600,
      count: 1000,
    },
    removeOnFail: {
      age: 86400,
    },
  },
});

/**
 * Process connection test job
 */
async function processConnectionTest(job: Job): Promise<any> {
  const terminalManager = getTerminalManager();
  const {
    encrypted_login,
    encrypted_password,
    encrypted_server,
    user_id,
    broker_type
  } = job.data;

  // Decrypt credentials
  const login = decryptCredentials(encrypted_login, user_id);
  const password = decryptCredentials(encrypted_password, user_id);
  const server = decryptCredentials(encrypted_server, user_id);

  // Acquire a terminal instance
  const terminal = await terminalManager.acquireTerminal(user_id);
  if (!terminal) {
    throw new Error('No available MT5 terminals. Please try again in a moment.');
  }

  try {
    // Get terminal paths
    const terminalPath = terminalManager.getTerminalPortablePath(terminal.id);
    const terminalDataPath = terminalManager.getTerminalDataPath(terminal.id);

    // Call Python script with terminal assignment
    const pythonScript = path.join(__dirname, '../python/test_connection.py');
    // On Ubuntu VPS with Wine, use wine to run Windows Python
    const pythonCmd = process.platform === 'win32' ? 'python' : process.platform === 'linux' ? 'wine' : 'python3';
    const pythonScriptDir = path.dirname(pythonScript);
    // Convert Linux path to Wine Windows path (Z: drive)
    const winePythonPath = process.platform === 'linux' 
      ? pythonScriptDir.replace(/^\/root/, 'Z:\\root').replace(/\//g, '\\')
      : pythonScriptDir;
    const pythonArgs = process.platform === 'linux' 
      ? ['C:\\Python310\\python.exe', pythonScript] 
      : [pythonScript];
    
    const credentials = {
      login,
      password,
      server,
      terminal_id: terminal.id,
      terminal_path: terminalPath,
      terminal_data_path: terminalDataPath,
      portable_mode: true
    };

    const pythonEnv = process.platform === 'linux' 
      ? { ...process.env, PYTHONUNBUFFERED: '1', PYTHONPATH: winePythonPath }
      : { ...process.env, PYTHONUNBUFFERED: '1' };

    const result = await new Promise<any>((resolve, reject) => {
      const pythonProcess = spawn(pythonCmd, [...pythonArgs, JSON.stringify(credentials)], {
        env: pythonEnv,
        cwd: process.platform === 'linux' ? pythonScriptDir : undefined
      });

      let stdout = '';
      let stderr = '';

      const timeout = setTimeout(() => {
        pythonProcess.kill('SIGTERM');
        reject(new Error('Connection test timeout (60s)'));
      }, 60000);

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        clearTimeout(timeout);
        
        if (code !== 0) {
          reject(new Error(`Python script failed with code ${code}: ${stderr}`));
          return;
        }

        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (error: any) {
          reject(new Error(`Failed to parse Python output: ${error.message}`));
        }
      });
    });

    return result;
  } finally {
    // Always release the terminal
    terminalManager.releaseTerminal(terminal.id);
  }
}

/**
 * Process trade fetch job
 */
async function processFetchTrades(job: Job): Promise<any> {
  const terminalManager = getTerminalManager();
  const {
    encrypted_login,
    encrypted_password,
    encrypted_server,
    user_id
  } = job.data;

  // Decrypt credentials
  const login = decryptCredentials(encrypted_login, user_id);
  const password = decryptCredentials(encrypted_password, user_id);
  const server = decryptCredentials(encrypted_server, user_id);

  // Acquire a terminal instance
  const terminal = await terminalManager.acquireTerminal(user_id);
  if (!terminal) {
    throw new Error('No available MT5 terminals. Please try again in a moment.');
  }

  try {
    // Get terminal paths
    const terminalPath = terminalManager.getTerminalPortablePath(terminal.id);
    const terminalDataPath = terminalManager.getTerminalDataPath(terminal.id);

    // Call Python script with terminal assignment
    const pythonScript = path.join(__dirname, '../python/fetch_trades.py');
    // On Ubuntu VPS with Wine, use wine to run Windows Python
    const pythonCmd = process.platform === 'win32' ? 'python' : process.platform === 'linux' ? 'wine' : 'python3';
    const pythonScriptDir = path.dirname(pythonScript);
    // Convert Linux path to Wine Windows path (Z: drive)
    const winePythonPath = process.platform === 'linux' 
      ? pythonScriptDir.replace(/^\/root/, 'Z:\\root').replace(/\//g, '\\')
      : pythonScriptDir;
    const pythonArgs = process.platform === 'linux' 
      ? ['C:\\Python310\\python.exe', pythonScript] 
      : [pythonScript];
    
    const credentials = {
      login,
      password,
      server,
      terminal_id: terminal.id,
      terminal_path: terminalPath,
      terminal_data_path: terminalDataPath,
      portable_mode: true
    };

    const pythonEnv = process.platform === 'linux' 
      ? { ...process.env, PYTHONUNBUFFERED: '1', PYTHONPATH: winePythonPath }
      : { ...process.env, PYTHONUNBUFFERED: '1' };

    const result = await new Promise<any>((resolve, reject) => {
      const pythonProcess = spawn(pythonCmd, [...pythonArgs, JSON.stringify(credentials)], {
        env: pythonEnv,
        cwd: process.platform === 'linux' ? pythonScriptDir : undefined
      });

      let stdout = '';
      let stderr = '';

      const timeout = setTimeout(() => {
        pythonProcess.kill('SIGTERM');
        reject(new Error('Trade fetch timeout (60s)'));
      }, 60000);

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        clearTimeout(timeout);
        
        if (code !== 0) {
          reject(new Error(`Python script failed with code ${code}: ${stderr}`));
          return;
        }

        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (error: any) {
          reject(new Error(`Failed to parse Python output: ${error.message}`));
        }
      });
    });

    return result;
  } finally {
    // Always release the terminal
    terminalManager.releaseTerminal(terminal.id);
  }
}

/**
 * Create workers for processing jobs
 */
export function createWorkers(): {
  connectionTestWorker: Worker;
  fetchTradesWorker: Worker;
} {
  const terminalManager = getTerminalManager();
  const maxTerminals = terminalManager.getStats().total;
  
  // Create workers - one per terminal instance for maximum concurrency
  const connectionTestWorker = new Worker(
    'mt5-connection-test',
    processConnectionTest,
    {
      connection: redisConnection,
      concurrency: maxTerminals, // Process up to maxTerminals jobs concurrently
      limiter: {
        max: 10, // Max 10 jobs per second per worker
        duration: 1000,
      },
    }
  );

  const fetchTradesWorker = new Worker(
    'mt5-fetch-trades',
    processFetchTrades,
    {
      connection: redisConnection,
      concurrency: maxTerminals, // Process up to maxTerminals jobs concurrently
      limiter: {
        max: 10, // Max 10 jobs per second per worker
        duration: 1000,
      },
    }
  );

  // Worker event handlers
  connectionTestWorker.on('completed', (job) => {
    console.log(`[Queue] ✅ Connection test job ${job.id} completed`);
  });

  connectionTestWorker.on('failed', (job, err) => {
    console.error(`[Queue] ❌ Connection test job ${job?.id} failed:`, err.message);
  });

  // Suppress Redis connection errors - Redis is optional, service falls back to direct processing
  connectionTestWorker.on('error', (err) => {
    // Only log if it's not a connection refused error (Redis not available is expected)
    if (!err.message?.includes('ECONNREFUSED') && !err.message?.includes('Redis')) {
      console.error(`[Queue] Worker error:`, err.message);
    }
  });

  fetchTradesWorker.on('completed', (job) => {
    console.log(`[Queue] ✅ Trade fetch job ${job.id} completed`);
  });

  fetchTradesWorker.on('failed', (job, err) => {
    console.error(`[Queue] ❌ Trade fetch job ${job?.id} failed:`, err.message);
  });

  // Suppress Redis connection errors - Redis is optional, service falls back to direct processing
  fetchTradesWorker.on('error', (err) => {
    // Only log if it's not a connection refused error (Redis not available is expected)
    if (!err.message?.includes('ECONNREFUSED') && !err.message?.includes('Redis')) {
      console.error(`[Queue] Worker error:`, err.message);
    }
  });

  return {
    connectionTestWorker,
    fetchTradesWorker,
  };
}

/**
 * Add connection test job to queue
 * Returns a Job or throws error if Redis is unavailable
 */
export async function queueConnectionTest(data: {
  encrypted_login: string;
  encrypted_password: string;
  encrypted_server: string;
  user_id: string;
  broker_type: string;
}): Promise<Job> {
  try {
    // Stagger login attempts to prevent broker bans
    // Delay ensures logins don't all happen at the exact same millisecond
    return await connectionTestQueue.add('test-connection', data, {
      priority: 1, // Higher priority for connection tests
      delay: LOGIN_DELAY_MS, // Stagger logins by configured delay (default 500ms = 2 logins/second)
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000, // 2s, 4s, 8s
      },
    });
  } catch (error: any) {
    // If Redis is not available, throw error so caller can fallback to direct processing
    if (error.message?.includes('ECONNREFUSED') || error.message?.includes('Redis')) {
      throw new Error('Redis not available - queue system unavailable');
    }
    throw error;
  }
}

/**
 * Add trade fetch job to queue
 * Returns a Job or throws error if Redis is unavailable
 */
export async function queueFetchTrades(data: {
  encrypted_login: string;
  encrypted_password: string;
  encrypted_server: string;
  user_id: string;
}): Promise<Job> {
  try {
    // Stagger trade fetches to prevent broker bans
    // Uses same delay as connection tests for consistency
    return await fetchTradesQueue.add('fetch-trades', data, {
      priority: 2, // Lower priority for trade fetches
      delay: LOGIN_DELAY_MS, // Stagger fetches by configured delay (default 500ms = 2 fetches/second)
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000, // 2s, 4s, 8s
      },
    });
  } catch (error: any) {
    // If Redis is not available, throw error so caller can fallback to direct processing
    if (error.message?.includes('ECONNREFUSED') || error.message?.includes('Redis')) {
      throw new Error('Redis not available - queue system unavailable');
    }
    throw error;
  }
}

/**
 * Get job status
 */
export async function getJobStatus(queueName: 'mt5-connection-test' | 'mt5-fetch-trades', jobId: string): Promise<any> {
  const queue = queueName === 'mt5-connection-test' ? connectionTestQueue : fetchTradesQueue;
  const job = await queue.getJob(jobId);
  
  if (!job) {
    return null;
  }

  const state = await job.getState();
  const progress = job.progress;
  const returnvalue = job.returnvalue;
  const failedReason = job.failedReason;

  return {
    id: job.id,
    state,
    progress,
    returnvalue,
    failedReason,
    timestamp: job.timestamp,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
  };
}
