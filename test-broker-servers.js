/**
 * Server Verification Script
 * Tests all servers in the list to verify which ones actually work
 * 
 * Usage:
 *   node test-broker-servers.js
 * 
 * Requirements:
 *   - Valid broker credentials (Account, Password)
 *   - VPS_MT5_SERVICE_URL and VPS_API_KEY configured
 */

const SUPABASE_URL = 'https://kmuoqkcxguafxulqlbmi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2MDI5NjYsImV4cCI6MjA3MzE3ODk2Nn0.m6vaoaT7X7VvcKaY3W3aVEi5ZjqitAjQAJbyYnps_sc';

// Server lists from AutoJournalView.tsx
const SERVERS = {
  EC_MARKETS: [
    'ECMarketsLtd-Demo',
    'ECMarkets-MT5-Demo',
    'ECMarkets-MT5-Live01',
    'ECMarketsLtd-Live01',
    'ECMarketsLtd-Live02',
    'ECMarketsLtd-Live03'
  ],
  XS: [
    'XS.com-Demo',
    'XS.com-Live',
    'XS.com-MT5-Demo',
    'XS.com-MT5-Live'
  ],
  PU_PRIME: [
    'PUPrime-Demo',
    'PUPrime-Live',
    'PUPrime-Live01',
    'PUPrime-MT5-Demo',
    'PUPrime-MT5-Live'
  ]
};

/**
 * Test a single server
 */
async function testServer(brokerType, server, login, password) {
  try {
    console.log(`\n🔍 Testing: ${server}`);
    
    // Import encryption utilities (you'll need to adapt this)
    // For now, we'll send plain credentials and let Edge Function encrypt
    const response = await fetch(`${SUPABASE_URL}/functions/v1/test-broker-connection`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        broker_type: brokerType.toLowerCase(),
        login: login,
        password: password,
        server: server
      })
    });

    const result = await response.json();
    
    if (result.connected) {
      console.log(`✅ SUCCESS: ${server}`);
      console.log(`   Server used: ${result.server_used || server}`);
      console.log(`   Connection time: ${result.connection_time_ms}ms`);
      return { server, success: true, result };
    } else {
      console.log(`❌ FAILED: ${server}`);
      console.log(`   Error: ${result.error || 'Unknown error'}`);
      return { server, success: false, error: result.error };
    }
  } catch (error) {
    console.log(`❌ ERROR: ${server}`);
    console.log(`   ${error.message}`);
    return { server, success: false, error: error.message };
  }
}

/**
 * Test all servers for a broker
 */
async function testBrokerServers(brokerType, servers, login, password) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing ${brokerType} servers`);
  console.log(`${'='.repeat(60)}`);
  
  const results = [];
  
  for (const server of servers) {
    const result = await testServer(brokerType, server, login, password);
    results.push(result);
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  return results;
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Broker Server Verification Script\n');
  console.log('This script tests all servers in the list to verify which ones work.\n');
  console.log('⚠️  You need to provide valid broker credentials.\n');
  
  // Example: Test EC Markets servers
  // Replace with your actual credentials
  const EC_MARKETS_CREDENTIALS = {
    login: '81071266',  // Replace with your account
    password: 'Imperial@2026'  // Replace with your password
  };
  
  // Test EC Markets servers
  const ecMarketsResults = await testBrokerServers(
    'ecmarkets',
    SERVERS.EC_MARKETS,
    EC_MARKETS_CREDENTIALS.login,
    EC_MARKETS_CREDENTIALS.password
  );
  
  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('SUMMARY');
  console.log(`${'='.repeat(60)}`);
  console.log(`\nEC Markets Results:`);
  console.log(`  ✅ Working: ${ecMarketsResults.filter(r => r.success).length}`);
  console.log(`  ❌ Failed: ${ecMarketsResults.filter(r => !r.success).length}`);
  console.log(`\nWorking Servers:`);
  ecMarketsResults.filter(r => r.success).forEach(r => {
    console.log(`  ✅ ${r.server}`);
  });
  console.log(`\nFailed Servers:`);
  ecMarketsResults.filter(r => !r.success).forEach(r => {
    console.log(`  ❌ ${r.server}: ${r.error}`);
  });
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { testServer, testBrokerServers, SERVERS };
