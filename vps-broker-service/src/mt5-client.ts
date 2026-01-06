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

interface MT5Credentials {
  login: string;
  password: string;
  server: string;
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
 */
export async function testMT5Connection(credentials: MT5Credentials): Promise<{
  connected: boolean;
  account_info?: MT5AccountInfo;
  error?: string;
}> {
  return new Promise((resolve) => {
    const pythonScript = path.join(__dirname, '../python/test_connection.py');
    
    // Use 'python' on Windows, 'python3' on Unix
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const pythonProcess = spawn(pythonCmd, [pythonScript, JSON.stringify(credentials)]);
    
    let stdout = '';
    let stderr = '';
    
    // Set timeout to prevent hanging
    const timeout = setTimeout(() => {
      pythonProcess.kill();
      resolve({
        connected: false,
        error: 'Connection timeout (30s)'
      });
    }, 30000);
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      clearTimeout(timeout);
      
      if (code !== 0) {
        resolve({
          connected: false,
          error: stderr || 'Connection failed'
        });
        return;
      }
      
      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (error) {
        resolve({
          connected: false,
          error: 'Invalid response from MT5 service'
        });
      }
    });
  });
}

/**
 * Fetch trades from user's MT5 broker
 * Note: Uses mt5.login() which temporarily logs into the user's account
 * without closing the MT5 terminal or affecting price feeder
 */
export async function fetchMT5Trades(credentials: MT5Credentials): Promise<{
  trades: MT5Trade[];
  account_balance: number;
  error?: string;
}> {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, '../python/fetch_trades.py');
    
    // Use 'python' on Windows, 'python3' on Unix
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const pythonProcess = spawn(pythonCmd, [pythonScript, JSON.stringify(credentials)]);
    
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
      
      if (code !== 0) {
        reject(new Error(stderr || 'Failed to fetch trades'));
        return;
      }
      
      try {
        const result = JSON.parse(stdout);
        
        if (result.error) {
          reject(new Error(result.error));
          return;
        }
        
        resolve(result);
      } catch (error) {
        reject(new Error('Invalid response from MT5 service'));
      }
    });
  });
}


