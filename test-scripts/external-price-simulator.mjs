#!/usr/bin/env node

/**
 * External Price Feed Simulator
 * Simulates TraderMade or other external price providers
 * Tests the complete price-ingestor pipeline
 */

import https from 'https';
import http from 'http';

const SUPABASE_FUNCTION_URL = 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/price-ingestor';

// Test configuration
const CONFIG = {
  ingestKey: process.env.INGEST_SECRET || 'your-ingest-key-here',
  testDuration: 30000, // 30 seconds
  priceInterval: 2000, // Send prices every 2 seconds
  symbols: ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'BTCUSD'],
  verbose: process.argv.includes('--verbose')
};

// Base prices for realistic simulation
const BASE_PRICES = {
  'EURUSD': 1.0850,
  'GBPUSD': 1.2650,
  'USDJPY': 149.50,
  'XAUUSD': 2025.00,
  'BTCUSD': 43500.00
};

class PriceSimulator {
  constructor() {
    this.isRunning = false;
    this.priceHistory = new Map();
    this.stats = {
      sent: 0,
      successful: 0,
      failed: 0,
      totalLatency: 0
    };
  }

  generateRealisticPrice(symbol, basePrice) {
    // Get last price or use base
    const lastPrice = this.priceHistory.get(symbol) || basePrice;
    
    // Generate realistic price movement
    const volatility = symbol.includes('XAU') ? 0.001 : 
                      symbol.includes('BTC') ? 0.002 : 0.0005;
    
    const change = (Math.random() - 0.5) * 2 * volatility;
    const newPrice = lastPrice * (1 + change);
    
    this.priceHistory.set(symbol, newPrice);
    return Number(newPrice.toFixed(symbol.includes('JPY') ? 3 : 5));
  }

  async sendPriceBatch(symbols) {
    const timestamp = Date.now();
    const prices = {};
    
    symbols.forEach(symbol => {
      prices[symbol] = this.generateRealisticPrice(symbol, BASE_PRICES[symbol]);
    });

    const payload = {
      timestamp,
      prices,
      source: 'test-simulator',
      batch_id: `test_${timestamp}`
    };

    try {
      const startTime = Date.now();
      const response = await this.makeRequest(payload);
      const latency = Date.now() - startTime;
      
      this.stats.sent++;
      this.stats.totalLatency += latency;
      
      if (response.success) {
        this.stats.successful++;
        if (CONFIG.verbose) {
          console.log(`✅ Batch sent successfully (${latency}ms):`);
          console.log(`   Processed: ${response.data.processed}`);
          console.log(`   Filtered: ${response.data.filtered}`);
          console.log(`   Broadcasted: ${response.data.broadcasted}`);
          console.log(`   Efficiency: ${response.data.efficiency}`);
        }
      } else {
        this.stats.failed++;
        console.error(`❌ Batch failed: ${response.error}`);
      }
    } catch (error) {
      this.stats.failed++;
      console.error(`❌ Request error: ${error.message}`);
    }
  }

  makeRequest(payload) {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify(payload);
      const url = new URL(SUPABASE_FUNCTION_URL);
      
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          'X-INGEST-KEY': CONFIG.ingestKey
        }
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(body);
            resolve({
              success: res.statusCode === 200,
              data: response,
              error: res.statusCode !== 200 ? `HTTP ${res.statusCode}: ${body}` : null
            });
          } catch (e) {
            resolve({
              success: false,
              error: `Parse error: ${e.message}`
            });
          }
        });
      });

      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }

  async runTest() {
    console.log('\n🚀 Starting External Price Feed Simulator');
    console.log(`📊 Testing for ${CONFIG.testDuration / 1000}s with ${CONFIG.symbols.length} symbols`);
    console.log(`🔑 Using ingest key: ${CONFIG.ingestKey.substring(0, 8)}...`);
    console.log('─'.repeat(60));

    this.isRunning = true;
    const startTime = Date.now();

    // Send initial batch
    await this.sendPriceBatch(CONFIG.symbols);

    // Set up interval for regular price updates
    const interval = setInterval(async () => {
      if (!this.isRunning) {
        clearInterval(interval);
        return;
      }
      
      // Randomly select 2-4 symbols for more realistic batching
      const selectedSymbols = CONFIG.symbols
        .sort(() => 0.5 - Math.random())
        .slice(0, Math.floor(Math.random() * 3) + 2);
      
      await this.sendPriceBatch(selectedSymbols);
    }, CONFIG.priceInterval);

    // Stop after test duration
    setTimeout(() => {
      this.isRunning = false;
      clearInterval(interval);
      this.printSummary(Date.now() - startTime);
    }, CONFIG.testDuration);
  }

  printSummary(actualDuration) {
    console.log('\n' + '═'.repeat(60));
    console.log('📈 PRICE SIMULATOR TEST RESULTS');
    console.log('═'.repeat(60));
    console.log(`⏱️  Duration: ${(actualDuration / 1000).toFixed(1)}s`);
    console.log(`📤 Batches sent: ${this.stats.sent}`);
    console.log(`✅ Successful: ${this.stats.successful}`);
    console.log(`❌ Failed: ${this.stats.failed}`);
    console.log(`📊 Success rate: ${((this.stats.successful / this.stats.sent) * 100).toFixed(1)}%`);
    
    if (this.stats.successful > 0) {
      console.log(`⚡ Avg latency: ${(this.stats.totalLatency / this.stats.successful).toFixed(0)}ms`);
    }
    
    console.log('\n🔍 Price History:');
    this.priceHistory.forEach((price, symbol) => {
      const change = ((price - BASE_PRICES[symbol]) / BASE_PRICES[symbol] * 100).toFixed(3);
      console.log(`   ${symbol}: ${price} (${change > 0 ? '+' : ''}${change}%)`);
    });
    
    console.log('\n✨ Test completed successfully!');
  }
}

// CLI interface
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
External Price Feed Simulator

Usage: node external-price-simulator.mjs [options]

Options:
  --verbose    Show detailed request/response logs
  --help, -h   Show this help message

Environment Variables:
  INGEST_SECRET    The secret key for price-ingestor authentication

Example:
  INGEST_SECRET=your-key node external-price-simulator.mjs --verbose
`);
  process.exit(0);
}

// Run the simulator
const simulator = new PriceSimulator();
simulator.runTest().catch(console.error);