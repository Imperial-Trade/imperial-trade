/**
 * 🧪 Test All Brokers - Complete Connection Test
 * 
 * Tests all three brokers (EC Markets, XS.com, PU Prime) using the same flow
 * as the frontend: Encryption → Edge Function → VPS → Python → MT5
 */

import crypto from 'crypto';

// Test credentials from account confirmations
const BROKER_CREDENTIALS = {
  ecmarkets: {
    login: '800107112',
    password: 'Demo@123',
    server: 'ECMarkets-MT5-Demo',
    broker_type: 'ecmarkets',
    name: 'EC Markets'
  },
  xs: {
    login: '11321405',
    password: 'U!27bc5h',
    server: 'XSFintech-REAL-3',
    broker_type: 'xs',
    name: 'XS.com'
  },
  puprime: {
    login: '18448879',
    password: 'wb6V8e^t',
    server: 'PUPrime-Live4',
    broker_type: 'puprime',
    name: 'PU Prime'
  }
};

// Configuration
const ENCRYPTION_SECRET = 'ImperialTrade_BrokerEncryption_2025_v1';
const TEST_USER_ID = 'test-user-all-brokers';
const SUPABASE_URL = 'https://kmuoqkcxguafxulqlbmi.supabase.co';
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/test-broker-connection`;
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4NjkyNTAsImV4cCI6MjA2NzQ0NTI1MH0.gvBGgPvvOYwMI9g8H5Cm9rKFB02G6z4tHIHEepKf7MI';

/**
 * Encrypt credentials using AES-256-GCM (same as frontend)
 */
async function encryptCredentials(plaintext, userId) {
  const keyMaterial = `${userId}-${ENCRYPTION_SECRET}`;
  const keyData = Buffer.from(keyMaterial, 'utf-8');
  const keyHash = crypto.createHash('sha256').update(keyData).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyHash, iv);
  let encrypted = cipher.update(plaintext, 'utf-8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const authTag = cipher.getAuthTag();
  const combined = Buffer.concat([iv, encrypted, authTag]);
  return combined.toString('base64');
}

/**
 * Test a single broker connection
 */
async function testBroker(brokerKey) {
  const broker = BROKER_CREDENTIALS[brokerKey];
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 Testing ${broker.name.toUpperCase()}`);
  console.log('='.repeat(60));
  console.log(`  Login: ${broker.login}`);
  console.log(`  Server: ${broker.server}`);
  console.log(`  Password: ${broker.password.substring(0, 3)}***`);
  console.log('');
  
  try {
    // Step 1: Encrypt credentials
    console.log('📝 Step 1: Encrypting credentials...');
    const encryptedLogin = await encryptCredentials(broker.login, TEST_USER_ID);
    const encryptedPassword = await encryptCredentials(broker.password, TEST_USER_ID);
    const encryptedServer = await encryptCredentials(broker.server, TEST_USER_ID);
    console.log('✅ Encryption complete');
    console.log('');
    
    // Step 2: Call Edge Function
    console.log('📡 Step 2: Calling Edge Function...');
    const requestBody = {
      broker_type: broker.broker_type,
      encrypted_login: encryptedLogin,
      encrypted_password: encryptedPassword,
      encrypted_server: encryptedServer
    };
    
    const startTime = Date.now();
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
        'apikey': ANON_KEY
      },
      body: JSON.stringify(requestBody)
    });
    
    const responseTime = Date.now() - startTime;
    const responseText = await response.text();
    
    console.log(`⏱️  Response Time: ${responseTime}ms`);
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    console.log('');
    
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.log('❌ Invalid JSON Response:');
      console.log(responseText);
      return {
        broker: broker.name,
        success: false,
        error: 'Invalid response format',
        status: response.status
      };
    }
    
    // Step 3: Analyze results
    if (result.success && result.connected) {
      console.log('✅ ✅ ✅ SUCCESS: CONNECTED TO MT5! ✅ ✅ ✅');
      console.log('');
      console.log('📊 Account Information:');
      if (result.account_info) {
        const acc = result.account_info;
        console.log(`  ✅ Login ID: ${acc.login}`);
        console.log(`  ✅ Account Name: ${acc.name || 'N/A'}`);
        console.log(`  ✅ Server: ${acc.server}`);
        console.log(`  ✅ Balance: ${acc.balance} ${acc.currency || 'USD'}`);
        console.log(`  ✅ Equity: ${acc.equity} ${acc.currency || 'USD'}`);
        console.log(`  ✅ Margin: ${acc.margin || 'N/A'}`);
        console.log(`  ✅ Free Margin: ${acc.free_margin || acc.margin_free || 'N/A'}`);
        console.log(`  ✅ Leverage: 1:${acc.leverage || 'N/A'}`);
        console.log(`  ✅ Company: ${acc.company || 'N/A'}`);
        console.log(`  ✅ Trading Allowed: ${acc.trade_allowed ? 'Yes' : 'No'}`);
      }
      console.log('');
      
      return {
        broker: broker.name,
        success: true,
        connected: true,
        account_info: result.account_info,
        response_time: responseTime,
        status: response.status
      };
    } else {
      console.log('❌ Connection Failed');
      console.log(`  Error: ${result.error || 'Unknown error'}`);
      console.log('');
      
      // Analyze error type
      let errorType = 'Unknown';
      let suggestion = '';
      
      if (result.error) {
        if (result.error.includes('Unauthorized') || result.error.includes('JWT')) {
          errorType = 'Authentication';
          suggestion = 'This requires a valid user session. In production, this works with logged-in users.';
        } else if (result.error.includes('Login failed') || result.error.includes('Invalid password')) {
          errorType = 'Authentication (MT5)';
          suggestion = 'MT5 login failed. Check: credentials, server name (case-sensitive), or MT5 terminal login state.';
        } else if (result.error.includes('MT5 initialization') || result.error.includes('terminal64.exe')) {
          errorType = 'MT5 Terminal';
          suggestion = 'MT5 terminal not accessible. Ensure MT5 is running and logged in on VPS.';
        } else if (result.error.includes('timeout')) {
          errorType = 'Timeout';
          suggestion = 'Connection timeout. Check VPS network connectivity or MT5 response time.';
        } else if (result.error.includes('VPS') || result.error.includes('Failed to connect')) {
          errorType = 'VPS Connection';
          suggestion = 'Cannot reach VPS service. Check VPS status and network.';
        }
      }
      
      console.log(`🔍 Error Type: ${errorType}`);
      if (suggestion) {
        console.log(`💡 Suggestion: ${suggestion}`);
      }
      console.log('');
      
      return {
        broker: broker.name,
        success: false,
        connected: false,
        error: result.error || 'Unknown error',
        error_type: errorType,
        suggestion: suggestion,
        response_time: responseTime,
        status: response.status,
        vps_status: result.vps_status,
        vps_response: result.vps_response
      };
    }
    
  } catch (error) {
    console.log('❌ Network Error:', error.message);
    console.log('');
    
    return {
      broker: broker.name,
      success: false,
      error: error.message,
      error_type: 'Network Error',
      suggestion: 'Check network connectivity and Edge Function availability.'
    };
  }
}

/**
 * Test all brokers
 */
async function testAllBrokers() {
  console.log('🧪 TESTING ALL BROKERS');
  console.log('='.repeat(60));
  console.log('');
  console.log('This test simulates the exact frontend flow:');
  console.log('  1. Encrypt credentials (AES-256-GCM)');
  console.log('  2. Call Edge Function test-broker-connection');
  console.log('  3. Edge Function forwards to VPS');
  console.log('  4. VPS decrypts and calls Python MT5');
  console.log('  5. Python connects to MT5 terminal');
  console.log('');
  console.log('Brokers to test:');
  console.log('  • EC Markets (Demo)');
  console.log('  • XS.com (Real)');
  console.log('  • PU Prime (Live)');
  console.log('');
  
  const results = [];
  
  // Test each broker
  for (const brokerKey of Object.keys(BROKER_CREDENTIALS)) {
    const result = await testBroker(brokerKey);
    results.push(result);
    
    // Wait between tests to avoid rate limiting
    if (brokerKey !== 'puprime') {
      console.log('⏳ Waiting 2 seconds before next test...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log('');
  
  results.forEach(result => {
    const status = result.success && result.connected ? '✅ SUCCESS' : '❌ FAILED';
    console.log(`${status} - ${result.broker}`);
    if (result.success && result.connected) {
      console.log(`    Account: ${result.account_info?.login} on ${result.account_info?.server}`);
      console.log(`    Balance: ${result.account_info?.balance} ${result.account_info?.currency || 'USD'}`);
    } else {
      console.log(`    Error: ${result.error || 'Unknown'}`);
      if (result.error_type) {
        console.log(`    Type: ${result.error_type}`);
      }
    }
    console.log('');
  });
  
  const successCount = results.filter(r => r.success && r.connected).length;
  const totalCount = results.length;
  
  console.log('='.repeat(60));
  console.log(`Results: ${successCount}/${totalCount} brokers connected successfully`);
  console.log('='.repeat(60));
  console.log('');
  
  // Save results to file
  const fs = await import('fs');
  fs.writeFileSync(
    'broker-test-results.json',
    JSON.stringify(results, null, 2)
  );
  console.log('📄 Detailed results saved to: broker-test-results.json');
  console.log('');
  
  return results;
}

// Run tests
testAllBrokers().catch(console.error);






