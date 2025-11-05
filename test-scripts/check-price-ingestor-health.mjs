#!/usr/bin/env node

/**
 * Price Ingestor Health Check
 * Diagnoses why live prices aren't showing in create alerts
 */

import https from 'https';
import http from 'http';

const SUPABASE_URL = 'https://kmuoqkcxguafxulqlbmi.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'your-anon-key';
const INGEST_SECRET = process.env.INGEST_SECRET;

console.log('🔍 Price Ingestor Health Check\n');
console.log('='.repeat(60));

// Test 1: Check if market_prices table has recent data
async function checkDatabasePrices() {
  console.log('\n📊 Test 1: Checking database for recent price data...\n');

  return new Promise((resolve, reject) => {
    const fiveMinutesAgo = new Date(Date.now() - 300000).toISOString();
    const url = `${SUPABASE_URL}/rest/v1/market_prices?select=symbol,mid,bid,ask,updated_at&updated_at=gte.${fiveMinutesAgo}&order=updated_at.desc&limit=10`;

    const options = {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const prices = JSON.parse(data);

          if (prices.length === 0) {
            console.log('❌ NO RECENT PRICE DATA FOUND (last 5 minutes)');
            console.log('   This means the price ingestor has not received updates recently');
            resolve(false);
          } else {
            console.log(`✅ Found ${prices.length} recent price(s):\n`);
            prices.forEach(p => {
              const age = Math.round((Date.now() - new Date(p.updated_at).getTime()) / 1000);
              console.log(`   ${p.symbol}: $${p.mid || p.bid || 'N/A'} (${age}s ago)`);
            });
            resolve(true);
          }
        } catch (error) {
          console.log('❌ Error parsing response:', error.message);
          console.log('   Response:', data);
          reject(error);
        }
      });
    });

    req.on('error', error => {
      console.log('❌ Request failed:', error.message);
      reject(error);
    });

    req.end();
  });
}

// Test 2: Check if price ingestor endpoint is accessible
async function checkIngestorEndpoint() {
  console.log('\n🔌 Test 2: Checking price ingestor endpoint...\n');

  if (!INGEST_SECRET) {
    console.log('⚠️  INGEST_SECRET not set - cannot test authentication');
    console.log('   Set with: export INGEST_SECRET=your-secret-key');
    return false;
  }

  return new Promise((resolve) => {
    const testPayload = {
      prices: [
        {
          symbol: 'XAUUSD',
          price: 2025.50,
          bid: 2025.45,
          ask: 2025.55,
          timestamp: new Date().toISOString()
        }
      ]
    };

    const postData = JSON.stringify(testPayload);
    const url = `${SUPABASE_URL}/functions/v1/price-ingestor`;

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'X-INGEST-KEY': INGEST_SECRET
      }
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);

          if (res.statusCode === 200 && response.success) {
            console.log('✅ Price ingestor endpoint is working!');
            console.log(`   Processed: ${response.processed || 0} prices`);
            console.log(`   Upserted: ${response.upserted || 0} prices`);
            console.log(`   Architecture: ${response.architecture || 'unknown'}`);
            resolve(true);
          } else {
            console.log(`❌ Price ingestor returned error (status ${res.statusCode})`);
            console.log(`   Response:`, data);
            resolve(false);
          }
        } catch (error) {
          console.log('❌ Error parsing response:', error.message);
          console.log('   Response:', data);
          resolve(false);
        }
      });
    });

    req.on('error', error => {
      console.log('❌ Request failed:', error.message);
      console.log('   Possible causes:');
      console.log('   1. Price ingestor edge function not deployed');
      console.log('   2. Network connectivity issues');
      console.log('   3. Incorrect Supabase URL');
      resolve(false);
    });

    req.write(postData);
    req.end();
  });
}

// Test 3: Check if any external service is calling the ingestor
async function checkExternalFeed() {
  console.log('\n🌐 Test 3: Checking for external price feed activity...\n');

  return new Promise((resolve, reject) => {
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
    const url = `${SUPABASE_URL}/rest/v1/market_prices?select=symbol,updated_at&updated_at=gte.${oneMinuteAgo}&order=updated_at.desc&limit=1`;

    const options = {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const prices = JSON.parse(data);

          if (prices.length > 0) {
            const age = Math.round((Date.now() - new Date(prices[0].updated_at).getTime()) / 1000);
            console.log(`✅ External feed appears active (last update ${age}s ago)`);
            resolve(true);
          } else {
            console.log('❌ NO UPDATES in the last 60 seconds');
            console.log('   External price feed (DigitalOcean service) may be down');
            console.log('   Action required: Check/restart the external price feed service');
            resolve(false);
          }
        } catch (error) {
          console.log('❌ Error:', error.message);
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Run all tests
async function runHealthCheck() {
  try {
    const hasRecentData = await checkDatabasePrices();
    const endpointWorking = await checkIngestorEndpoint();
    const feedActive = await checkExternalFeed();

    console.log('\n' + '='.repeat(60));
    console.log('\n📋 SUMMARY:\n');

    if (hasRecentData && endpointWorking && feedActive) {
      console.log('✅ All systems operational!');
      console.log('   Live prices should be displaying correctly.');
    } else {
      console.log('❌ Issues detected:\n');

      if (!hasRecentData) {
        console.log('   • No recent price data in database');
      }
      if (!endpointWorking) {
        console.log('   • Price ingestor endpoint not responding correctly');
      }
      if (!feedActive) {
        console.log('   • External price feed not sending updates');
      }

      console.log('\n🔧 RECOMMENDED ACTIONS:\n');

      if (!feedActive) {
        console.log('   1. Check if DigitalOcean price feed service is running');
        console.log('   2. Verify INGEST_SECRET is configured correctly');
        console.log('   3. Check network connectivity to Supabase');
      }

      if (!endpointWorking) {
        console.log('   4. Verify price ingestor edge function is deployed');
        console.log('   5. Check Supabase function logs for errors');
      }

      console.log('\n   To send test prices:');
      console.log('   npm run test:price-simulator\n');
    }
  } catch (error) {
    console.error('\n❌ Health check failed:', error.message);
  }
}

runHealthCheck();
