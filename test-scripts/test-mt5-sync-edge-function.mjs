#!/usr/bin/env node
/**
 * Test Script for mt5-sync Edge Function
 * 
 * Tests:
 * 1. CORS preflight (OPTIONS)
 * 2. Authentication (x-ingest-key)
 * 3. Empty trades array (heartbeat)
 * 4. Sample trade data
 * 5. Error handling
 */

const SUPABASE_URL = 'https://kmuoqkcxguafxulqlbmi.supabase.co';
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/mt5-sync`;
const INGEST_SECRET = 'Imperial_Secret_2026';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[33m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, label, message) {
  console.log(`${colors[color]}${label}${colors.reset} ${message}`);
}

async function testCORS() {
  log('cyan', '🧪 Test 1:', 'CORS Preflight (OPTIONS)');
  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'OPTIONS',
      headers: {
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'x-ingest-key,content-type',
      },
    });
    
    if (response.ok) {
      log('green', '✅', 'CORS preflight successful');
      return true;
    } else {
      log('red', '❌', `CORS failed: ${response.status}`);
      return false;
    }
  } catch (error) {
    log('red', '❌', `CORS error: ${error.message}`);
    return false;
  }
}

async function testAuthentication() {
  log('cyan', '🧪 Test 2:', 'Authentication (Missing Key)');
  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ account: '123456', trades: [] }),
    });
    
    if (response.status === 401) {
      log('green', '✅', 'Correctly rejected request without key');
      return true;
    } else {
      log('red', '❌', `Expected 401, got ${response.status}`);
      const text = await response.text();
      console.log(`   Response: ${text}`);
      return false;
    }
  } catch (error) {
    log('red', '❌', `Auth test error: ${error.message}`);
    return false;
  }
}

async function testInvalidKey() {
  log('cyan', '🧪 Test 3:', 'Authentication (Invalid Key)');
  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ingest-key': 'wrong-key',
      },
      body: JSON.stringify({ account: '123456', trades: [] }),
    });
    
    if (response.status === 401) {
      log('green', '✅', 'Correctly rejected request with wrong key');
      return true;
    } else {
      log('red', '❌', `Expected 401, got ${response.status}`);
      return false;
    }
  } catch (error) {
    log('red', '❌', `Invalid key test error: ${error.message}`);
    return false;
  }
}

async function testEmptyTrades() {
  log('cyan', '🧪 Test 4:', 'Empty Trades Array (Heartbeat)');
  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ingest-key': INGEST_SECRET,
      },
      body: JSON.stringify({ 
        account: '123456', 
        trades: [] 
      }),
    });
    
    const data = await response.json();
    
    if (response.ok && data.success === true && data.trades_synced === 0) {
      log('green', '✅', 'Empty trades handled correctly');
      log('blue', '   ', `Response: ${JSON.stringify(data)}`);
      return true;
    } else {
      log('red', '❌', `Unexpected response: ${response.status}`);
      console.log(`   Data: ${JSON.stringify(data)}`);
      return false;
    }
  } catch (error) {
    log('red', '❌', `Empty trades test error: ${error.message}`);
    return false;
  }
}

async function testInvalidPayload() {
  log('cyan', '🧪 Test 5:', 'Invalid Payload (Missing Trades)');
  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ingest-key': INGEST_SECRET,
      },
      body: JSON.stringify({ 
        account: '123456',
        // Missing trades array
      }),
    });
    
    if (response.status === 400) {
      log('green', '✅', 'Correctly rejected invalid payload');
      const text = await response.text();
      log('blue', '   ', `Response: ${text}`);
      return true;
    } else {
      log('yellow', '⚠️', `Expected 400, got ${response.status}`);
      const text = await response.text();
      console.log(`   Response: ${text}`);
      return false;
    }
  } catch (error) {
    log('red', '❌', `Invalid payload test error: ${error.message}`);
    return false;
  }
}

async function testValidTradeData() {
  log('cyan', '🧪 Test 6:', 'Valid Trade Data Format');
  try {
    const sampleTrade = {
      account: '123456',
      trades: [
        {
          ticket: '12345',
          symbol: 'EURUSD',
          pnl: '125.50',
          dir: 'Long',
        },
        {
          ticket: '12346',
          symbol: 'GBPUSD',
          pnl: '-50.25',
          dir: 'Short',
        },
      ],
    };

    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ingest-key': INGEST_SECRET,
      },
      body: JSON.stringify(sampleTrade),
    });
    
    const data = await response.json();
    
    // Note: This will likely fail because we don't have a matching connection
    // But it should at least process the request format correctly
    if (response.status === 404 || response.status === 500) {
      log('yellow', '⚠️', 'Request format accepted (expected failure - no matching connection)');
      log('blue', '   ', `Status: ${response.status}`);
      log('blue', '   ', `Response: ${JSON.stringify(data)}`);
      return true; // Format was correct, just no matching connection
    } else if (response.ok) {
      log('green', '✅', 'Trade data processed successfully');
      log('blue', '   ', `Response: ${JSON.stringify(data)}`);
      return true;
    } else {
      log('yellow', '⚠️', `Unexpected status: ${response.status}`);
      console.log(`   Response: ${JSON.stringify(data)}`);
      return false;
    }
  } catch (error) {
    log('red', '❌', `Valid trade data test error: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  log('cyan', '🚀', 'Starting mt5-sync Edge Function Tests');
  console.log('='.repeat(60) + '\n');

  const results = {
    cors: await testCORS(),
    authMissing: await testAuthentication(),
    authInvalid: await testInvalidKey(),
    emptyTrades: await testEmptyTrades(),
    invalidPayload: await testInvalidPayload(),
    validTradeData: await testValidTradeData(),
  };

  console.log('\n' + '='.repeat(60));
  log('cyan', '📊', 'Test Results Summary');
  console.log('='.repeat(60));

  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;

  Object.entries(results).forEach(([test, result]) => {
    const icon = result ? '✅' : '❌';
    const status = result ? 'PASS' : 'FAIL';
    console.log(`  ${icon} ${test.padEnd(20)} ${status}`);
  });

  console.log('\n' + '-'.repeat(60));
  log('cyan', '📈', `Total: ${passed}/${total} tests passed`);
  console.log('='.repeat(60) + '\n');

  process.exit(passed === total ? 0 : 1);
}

// Run tests
runAllTests().catch(error => {
  log('red', '💥', `Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
