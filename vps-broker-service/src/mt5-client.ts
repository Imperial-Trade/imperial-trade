/**
 * MT5 Client Wrapper
 * 
 * Handles MT5 connections and trade fetching
 * Note: This requires MetaTrader5 Python library
 * For Node.js, we'll use a Python subprocess approach
 */

import { spawn } from 'child_process';
import { promisify } from 'util';
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
  balance: number;
  equity: number;
  margin: number;
  free_margin: number;
  margin_level: number;
}

/**
 * Test MT5 connection
 */
export async function testMT5Connection(credentials: MT5Credentials): Promise<{
  connected: boolean;
  account_info?: MT5AccountInfo;
  error?: string;
}> {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, '../python/test_connection.py');
    const pythonProcess = spawn('python3', [pythonScript, JSON.stringify(credentials)]);
    
    let stdout = '';
    let stderr = '';
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
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
 * Fetch trades from MT5
 */
export async function fetchMT5Trades(credentials: MT5Credentials): Promise<{
  trades: MT5Trade[];
  account_balance: number;
}> {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, '../python/fetch_trades.py');
    const pythonProcess = spawn('python3', [pythonScript, JSON.stringify(credentials)]);
    
    let stdout = '';
    let stderr = '';
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || 'Failed to fetch trades'));
        return;
      }
      
      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (error) {
        reject(new Error('Invalid response from MT5 service'));
      }
    });
  });
}

