/**
 * MT5 Client Wrapper
 * 
 * Handles MT5 connections and trade fetching via Python subprocess.
 * 
 * IMPORTANT: This service does NOT interfere with the live price feeder!
 * - It uses mt5.login() to temporarily connect to the user's broker
 * - The EC Markets MT5 Terminal remains open for price feeding
 * - Python MT5 library can connect to ANY broker server through the terminal
 */

import { spawn } from 'child_process';
import path from 'path';
import { tryServerVariations } from './server-name-normalizer';

interface MT5Credentials {
  login: string;
  password: string;
  server: string;
  terminal_id?: number;
  terminal_path?: string;
  terminal_data_path?: string;
  portable_mode?: boolean;
}

interface MT5Trade {
  ticket: number;
  symbol: string;
  type: number; // 0=Buy, 1=Sell
  volume: number;
  price_open: number;
  price_current: number;
  price_close?: number;
  sl: number;
  tp: number;
  profit: number;
  swap: number;
  commission: number;
  time: number;
  time_close?: number;
  comment?: string;
}

interface MT5AccountInfo {
  login: number;
  name: string;
  server: string;
  balance: number;
  equity: number;
  currency: string;
  leverage: number;
}

/**
 * Test MT5 connection to user's broker
 * Note: Uses mt5.login() which temporarily logs into the user's account
 * without closing the MT5 terminal or affecting price feeder
 * Tries multiple server name variations to find the correct one
 */
export async function testMT5Connection(credentials: MT5Credentials): Promise<{
  connected: boolean;
  account_info?: MT5AccountInfo;
  server_used?: string;
  error?: string;
}> {
  return new Promise((resolve) => {
    // Get server name variations
    const serverVariations = tryServerVariations(
      credentials.login,
      credentials.password,
      credentials.server
    );
    
    console.log(`[MT5 Client] Will try ${serverVariations.length} server name variation(s):`);
    serverVariations.forEach((v, i) => {
      console.log(`   ${i + 1}. "${v.server}" (priority ${v.priority})`);
    });
    
    // Try variations in priority order
    let attemptIndex = 0;
    
    const tryNextVariation = () => {
      if (attemptIndex >= serverVariations.length) {
        resolve({
          connected: false,
          error: `All server variations failed. Tried: ${serverVariations.map(v => v.server).join(', ')}`
        });
        return;
      }
      
      const variation = serverVariations[attemptIndex];
      console.log(`[MT5 Client] Attempt ${attemptIndex + 1}/${serverVariations.length}: Trying server "${variation.server}"`);
      
      const testCredentials = {
        ...credentials,
        server: variation.server
      };
      
      const pythonScript = path.join(__dirname, '../python/test_connection.py');
      // On Ubuntu VPS with Wine, use wine to run Windows Python
      const pythonCmd = process.platform === 'win32' ? 'python' : process.platform === 'linux' ? 'wine' : 'python3';
      const pythonScriptDir = path.dirname(pythonScript);
      
      // Convert Linux path to Wine Windows path (Z: drive mapping)
      let winePythonScript: string;
      if (process.platform === 'linux') {
        // Convert /root/imperial-factory/broker-service/python/test_connection.py
        // to Z:\root\imperial-factory\broker-service\python\test_connection.py
        winePythonScript = pythonScript.replace(/^\/root/, 'Z:\\root').replace(/\//g, '\\');
      } else {
        winePythonScript = pythonScript;
      }
      
      const pythonArgs = process.platform === 'linux' 
        ? ['C:\\Python310\\python.exe', winePythonScript] 
        : [pythonScript];
      
      // Enhanced timeout: 60 seconds for connection attempts (allows for server variation retries)
      const connectionTimeout = 60000;
      const startTime = Date.now();
      
      // CRITICAL FIX: Suppress Wine debug logs to prevent ntdll synchronization errors
      // WINEDEBUG=-all removes the "CriticalSection" error noise
      // This prevents Wine from trying to print warnings while MT5 locks threads for API
      const pythonEnv = process.platform === 'linux'
        ? { ...process.env, PYTHONUNBUFFERED: '1', WINEDEBUG: '-all' }
        : { ...process.env, PYTHONUNBUFFERED: '1' };
      
      const pythonProcess = spawn(pythonCmd, [...pythonArgs, JSON.stringify(testCredentials)], {
        env: pythonEnv, // Include WINEDEBUG=-all for Linux/Wine
        cwd: process.platform === 'linux' ? pythonScriptDir : undefined
      });
    
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    
    // Reduced timeout: 6 seconds per variation attempt
    // Edge function has 15s total timeout, so we need to fail fast
    // If MT5 Python IPC doesn't work in 6s, it won't work at all
    const timeout = setTimeout(() => {
      timedOut = true;
      pythonProcess.kill('SIGTERM');
      // Force kill if SIGTERM doesn't work
      setTimeout(() => {
        try {
          pythonProcess.kill('SIGKILL');
        } catch (e) {
          // Process already dead
        }
      }, 1000);
      console.log(`[MT5 Client] Connection attempt ${attemptIndex + 1} timed out after 6s`);
      // Try next variation
      attemptIndex++;
      tryNextVariation();
    }, 6000);
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
      pythonProcess.on('close', (code) => {
        clearTimeout(timeout);
        const elapsed = Date.now() - startTime;
        
        // Enhanced logging
        if (stdout) {
          console.log(`[MT5 Client] Python stdout (${elapsed}ms): ${stdout.substring(0, 500)}`);
        }
        if (stderr) {
          console.log(`[MT5 Client] Python stderr (${elapsed}ms): ${stderr.substring(0, 500)}`);
        }
        console.log(`[MT5 Client] Python exit code: ${code} (attempt ${attemptIndex + 1}/${serverVariations.length})`);
        
        // If timed out, don't try to parse output
        if (timedOut) {
          console.log(`[MT5 Client] Attempt ${attemptIndex} was terminated due to timeout`);
          // tryNextVariation() already called in timeout handler
          return;
        }
        
        if (code !== 0) {
          // Try next variation
          attemptIndex++;
          tryNextVariation();
          return;
        }
        
        try {
          const result = JSON.parse(stdout);
          if (result.connected) {
            console.log(`[MT5 Client] ✅ Connection successful with server "${variation.server}" (${elapsed}ms)`);
            resolve({
              ...result,
              server_used: variation.server
            });
          } else {
            console.log(`[MT5 Client] ❌ Connection failed with server "${variation.server}": ${result.error || 'Unknown error'}`);
            // Try next variation
            attemptIndex++;
            tryNextVariation();
          }
        } catch (error: any) {
          console.error(`[MT5 Client] ❌ Failed to parse Python output: ${error?.message || error}`);
          // Try next variation
          attemptIndex++;
          tryNextVariation();
        }
      });
    };
    
    // Start trying variations
    tryNextVariation();
  });
}

/**
 * Fetch trades from user's MT5 broker
 * Note: Uses mt5.login() which temporarily logs into the user's account
 * without closing the MT5 terminal or affecting price feeder
 * Tries multiple server name variations to find the correct one
 */
export async function fetchMT5Trades(credentials: MT5Credentials): Promise<{
  trades: MT5Trade[];
  account_balance: number;
  server_used?: string;
  error?: string;
}> {
  return new Promise((resolve, reject) => {
    // Get server name variations
    const serverVariations = tryServerVariations(
      credentials.login,
      credentials.password,
      credentials.server
    );
    
    console.log(`[MT5 Client] Will try ${serverVariations.length} server name variation(s) for trade fetch:`);
    serverVariations.forEach((v, i) => {
      console.log(`   ${i + 1}. "${v.server}" (priority ${v.priority})`);
    });
    
    // Try variations in priority order
    let attemptIndex = 0;
    
    const tryNextVariation = () => {
      if (attemptIndex >= serverVariations.length) {
        reject(new Error(`All server variations failed. Tried: ${serverVariations.map(v => v.server).join(', ')}`));
        return;
      }
      
      const variation = serverVariations[attemptIndex];
      console.log(`[MT5 Client] Attempt ${attemptIndex + 1}/${serverVariations.length}: Trying server "${variation.server}"`);
      
      const testCredentials = {
        ...credentials,
        server: variation.server
      };
      
      const pythonScript = path.join(__dirname, '../python/fetch_trades.py');
      // On Ubuntu VPS with Wine, use wine to run Windows Python
      const pythonCmd = process.platform === 'win32' ? 'python' : process.platform === 'linux' ? 'wine' : 'python3';
      const pythonScriptDir = path.dirname(pythonScript);
      const pythonArgs = process.platform === 'linux' 
        ? ['C:\\Python310\\python.exe', pythonScript] 
        : [pythonScript];
      
      // CRITICAL FIX: Suppress Wine debug logs to prevent ntdll synchronization errors
      const pythonEnv = process.platform === 'linux'
        ? { ...process.env, PYTHONUNBUFFERED: '1', PYTHONPATH: pythonScriptDir, WINEDEBUG: '-all' }
        : { ...process.env, PYTHONUNBUFFERED: '1' };

      const pythonProcess = spawn(pythonCmd, [...pythonArgs, JSON.stringify(testCredentials)], {
        env: pythonEnv, // Include WINEDEBUG=-all for Linux/Wine
        cwd: process.platform === 'linux' ? pythonScriptDir : undefined
      });
    
    let stdout = '';
    let stderr = '';
    
    // Set timeout to prevent hanging
    const timeout = setTimeout(() => {
      pythonProcess.kill();
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
        
        // Log for debugging
        if (stdout) {
          console.log(`[MT5 Client] Python stdout: ${stdout.substring(0, 500)}`);
        }
        if (stderr) {
          console.log(`[MT5 Client] Python stderr: ${stderr.substring(0, 500)}`);
        }
        console.log(`[MT5 Client - Fetch] Python exit code: ${code}`);
        
        if (code !== 0) {
          // Try next variation
          attemptIndex++;
          tryNextVariation();
          return;
        }
        
        try {
          const result = JSON.parse(stdout);
          
          if (result.error) {
            // Try next variation
            attemptIndex++;
            tryNextVariation();
            return;
          }
          
          resolve({
            ...result,
            server_used: variation.server
          });
        } catch (error) {
          // Try next variation
          attemptIndex++;
          tryNextVariation();
        }
      });
    };
    
    // Start trying variations
    tryNextVariation();
  });
}


