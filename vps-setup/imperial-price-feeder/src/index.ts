/**
 * Imperial Price Feeder - Uses broker service bridge pattern
 * Spawns Python script directly (no file-based approach)
 * Reuses existing MT5 connection, same as broker service
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { spawn } from 'child_process';
import fetch from 'node-fetch';

// Load environment variables
const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

const SUPABASE_FUNCTION_URL = process.env.SUPABASE_FUNCTION_URL || 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/price-ingestor';
const INGEST_SECRET = process.env.INGEST_SECRET || 'ImperialTrade_IngestSecret_2025_v1';
const PRICE_INTERVAL = parseInt(process.env.PRICE_INTERVAL || '500', 10); // 500ms = 2 prices per second
const PYTHON_SCRIPT = path.join(__dirname, '..', 'python', 'mt5_price_reader.py');
const SYMBOLS = (process.env.SYMBOLS || 'XAUUSD,BTCUSD,U30USD,SPXUSD,NDXUSD').split(',').map(s => s.trim());

// Symbol mapping
const SYMBOL_MAP: Record<string, string> = {
  'GOLD': 'XAUUSD',
  'GOLD/USD': 'XAUUSD',
  'XAU/USD': 'XAUUSD',
  'BTC/USD': 'BTCUSD',
  'US30': 'U30USD',
  'SPX500': 'SPXUSD',
  'NAS100': 'NDXUSD'
};

class PriceFeeder {
  private isRunning = false;
  private isFetching = false; // Lock to prevent concurrent Python calls
  private stats = {
    sent: 0,
    successful: 0,
    failed: 0,
    errors: 0,
    lastUpdate: new Date()
  };

  async start() {
    console.log('🚀 Starting Imperial Price Feeder (Broker Service Bridge Pattern)...');
    console.log(`📍 Supabase Function: ${SUPABASE_FUNCTION_URL}`);
    console.log(`📊 Symbols: ${SYMBOLS.join(', ')}`);
    console.log(`🐍 Python Script: ${PYTHON_SCRIPT}`);
    console.log(`⏱️  Interval: ${PRICE_INTERVAL}ms`);
    console.log(`🔑 Ingest Secret: ${INGEST_SECRET.substring(0, 10)}...`);
    console.log('');
    console.log('ℹ️  Using broker service bridge pattern - direct Python spawn');
    console.log('   (Reuses existing MT5 connection, same as broker service)');

    this.isRunning = true;
    await this.fetchAndSendPrices();
  }

  private async fetchAndSendPrices() {
    if (!this.isRunning) return;

    // Prevent concurrent Python calls (lock mechanism)
    if (this.isFetching) {
      console.warn('⚠️  Previous fetch still in progress, skipping...');
      setTimeout(() => this.fetchAndSendPrices(), PRICE_INTERVAL);
      return;
    }

    this.isFetching = true;

    try {
      // Spawn Python script directly (broker service pattern)
      const prices = await this.getPricesFromPython();

      if (prices && prices.length > 0) {
        await this.sendPricesToSupabase(prices);
      } else {
        console.warn('⚠️  No prices received from Python script');
      }
    } catch (error) {
      console.error('❌ Error fetching/sending prices:', error);
      this.stats.errors++;
    } finally {
      this.isFetching = false;
      // Schedule next fetch
      setTimeout(() => this.fetchAndSendPrices(), PRICE_INTERVAL);
    }
  }

  private async getPricesFromPython(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
      const pythonProcess = spawn(pythonCmd, [PYTHON_SCRIPT], {
        cwd: path.join(__dirname, '..'),
        env: { ...process.env, PYTHONUNBUFFERED: '1' },
        shell: true
      });

      let stdout = '';
      let stderr = '';
      const timeout = 10000; // 10 second timeout

      const timeoutId = setTimeout(() => {
        pythonProcess.kill('SIGTERM');
        setTimeout(() => {
          try {
            pythonProcess.kill('SIGKILL');
          } catch (e) {
            // Process already dead
          }
        }, 2000);
        reject(new Error('Python script timeout (10s)'));
      }, timeout);

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        clearTimeout(timeoutId);

        if (code !== 0) {
          reject(new Error(`Python script exited with code ${code}. stderr: ${stderr.substring(0, 500)}`));
          return;
        }

        try {
          const result = JSON.parse(stdout);
          
          if (result.error) {
            reject(new Error(result.error));
            return;
          }

          if (result.prices && Array.isArray(result.prices)) {
            resolve(result.prices);
          } else {
            reject(new Error('Invalid Python output format - expected prices array'));
          }
        } catch (error) {
          reject(new Error(`Failed to parse Python output: ${error}. stdout: ${stdout.substring(0, 500)}`));
        }
      });

      pythonProcess.on('error', (error) => {
        clearTimeout(timeoutId);
        reject(new Error(`Failed to spawn Python process: ${error.message}`));
      });
    });
  }

  private async sendPricesToSupabase(prices: any[]) {
    try {
      const payload = {
        prices: prices.map(p => ({
          symbol: this.normalizeSymbol(p.symbol),
          price: p.price || p.mid || p.bid || p.ask,
          timestamp: p.timestamp || new Date().toISOString()
        }))
      };

      const response = await (fetch as any)(SUPABASE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-INGEST-KEY': INGEST_SECRET
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      this.stats.sent += prices.length;
      this.stats.successful += prices.length;
      this.stats.lastUpdate = new Date();

      if (this.stats.sent % 100 === 0) {
        console.log(`✅ Sent ${this.stats.sent} prices (${this.stats.successful} successful, ${this.stats.failed} failed)`);
      }
    } catch (error) {
      console.error('❌ Failed to send prices:', error);
      this.stats.failed += prices.length;
      this.stats.errors++;
    }
  }

  private normalizeSymbol(symbol: string): string {
    const upper = symbol.toUpperCase();
    return SYMBOL_MAP[upper] || upper;
  }

  stop() {
    this.isRunning = false;
    console.log('🛑 Price Feeder stopped');
  }

  getStats() {
    return { ...this.stats };
  }
}

// Start the feeder
const feeder = new PriceFeeder();
feeder.start().catch(console.error);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down...');
  feeder.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down...');
  feeder.stop();
  process.exit(0);
});
