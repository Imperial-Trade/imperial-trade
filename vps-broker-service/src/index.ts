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
import { decryptCredentials } from './encryption';
import { testMT5Connection, fetchMT5Trades } from './mt5-client';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001; // Use 3001 to avoid conflict with price feeder
const API_KEY = process.env.VPS_API_KEY || '';

// Middleware
app.use(cors());
app.use(express.json());

// API Key validation middleware
function validateApiKey(req: Request, res: Response, next: Function) {
  const apiKey = req.headers['x-api-key'];
  
  if (!API_KEY || !apiKey || apiKey !== API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  next();
}

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'imperial-trade-broker-service' });
});

// Test MT5 connection
app.post('/test-connection', validateApiKey, async (req: Request, res: Response) => {
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

    // Test connection
    const result = await testMT5Connection({ login, password, server });

    if (!result.connected) {
      return res.status(400).json({
        connected: false,
        error: result.error || 'Failed to connect to MT5'
      });
    }

    res.json({
      connected: true,
      account_info: result.account_info,
      message: 'Connection successful'
    });
  } catch (error: any) {
    console.error('❌ Error testing connection:', error);
    res.status(500).json({
      connected: false,
      error: error.message || 'Internal server error'
    });
  }
});

// Fetch trades from MT5
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

    // Fetch trades
    const result = await fetchMT5Trades({ login, password, server });

    res.json({
      trades: result.trades,
      account_balance: result.account_balance
    });
  } catch (error: any) {
    console.error('❌ Error fetching trades:', error);
    res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Imperial Trade Broker Service running on port ${PORT}`);
  console.log(`📝 API Key required: ${API_KEY ? 'Set' : 'NOT SET - Please configure VPS_API_KEY'}`);
});
