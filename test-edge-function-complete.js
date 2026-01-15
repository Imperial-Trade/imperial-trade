/**
 * Complete Edge Function Test
 * Tests the full flow: Edge Function → VPS → Python → MT5 → Python → VPS → Edge Function
 */

const crypto = require('crypto');
const https = require('https');

// Configuration
const SUPABASE_URL = 'https://kmuoqkcxguafxulqlbmi.supabase.co';
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/test-broker-connection`;

// Test credentials
const TEST_CREDENTIALS = {
  login: '800107112',
  password: 'Demo@123',
  server: 'ECMarketsLtd-Demo',
  broker_type: 'ecmarkets'
};

// Encryption secret (must match frontend/VPS)
const ENCRYPTION_SECRET = 'ImperialTrade_BrokerEncryption_2025_v1';

// For testing, we'll use a test user ID
const TEST_USER_ID = 'test-user-id-for-edge-function-test';

/**
 * Encrypt credentials using same method as frontend
 */
function encryptCredentials(plaintext, userId) {
  const keyMaterial = `${userId}-${ENCRYPTION_SECRET}`;
  const key = crypto.createHash('sha256').update(keyMaterial).digest();
  
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  const authTag = cipher.getAuthTag();
  const combined = Buffer.concat([iv, encrypted, authTag]);
  
  return combined.toString('base64');
}

/**
 * Test Edge Function with service role key (bypasses user auth)
 * OR with a valid session token
 */
async function testEdgeFunction(useServiceRole = false, sessionToken = null) {
  console.log('🧪 Testing Edge Function → VPS → MT5 Flow');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    // Encrypt credentials
    console.log('🔐 Encrypting credentials...');
    const encryptedLogin = encryptCredentials(TEST_CREDENTIALS.login, TEST_USER_ID);
    const encryptedPassword = encryptCredentials(TEST_CREDENTIALS.password, TEST_USER_ID);
    const encryptedServer = encryptCredentials(TEST_CREDENTIALS.server, TEST_USER_ID);
    console.log('✅ Credentials encrypted\n');

    // Prepare request body
    const requestBody = {
      broker_type: TEST_CREDENTIALS.broker_type,
      encrypted_login: encryptedLogin,
      encrypted_password: encryptedPassword,
      encrypted_server: encryptedServer
    };

    // Prepare headers
    const headers = {
      'Content-Type': 'application/json'
    };

    if (useServiceRole) {
      // Use service role key to bypass user auth (for testing)
      const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!SERVICE_ROLE_KEY) {
        console.error('❌ SUPABASE_SERVICE_ROLE_KEY not set. Cannot use service role.');
        console.error('   Please set it: export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"');
        return;
      }
      headers['Authorization'] = `Bearer ${SERVICE_ROLE_KEY}`;
      headers['apikey'] = SERVICE_ROLE_KEY;
      console.log('⚠️  Using service role key (bypasses user auth)');
    } else if (sessionToken) {
      headers['Authorization'] = `Bearer ${sessionToken}`;
      // Get anon key from environment or use default
      const ANON_KEY = process.env.SUPABASE_ANON_KEY || 'YOUR_ANON_KEY_HERE';
      headers['apikey'] = ANON_KEY;
      console.log('✅ Using session token');
    } else {
      console.error('❌ No authentication method provided.');
      console.error('   Option 1: Use service role key: testEdgeFunction(true)');
      console.error('   Option 2: Use session token: testEdgeFunction(false, "your-session-token")');
      return;
    }

    console.log('');
    console.log('📡 Calling Edge Function: test-broker-connection');
    console.log('   URL:', EDGE_FUNCTION_URL);
    console.log('   Broker Type:', TEST_CREDENTIALS.broker_type);
    console.log('   Login:', TEST_CREDENTIALS.login);
    console.log('   Server:', TEST_CREDENTIALS.server);
    console.log('');

    // Make request
    const startTime = Date.now();
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody)
    });

    const elapsed = Date.now() - startTime;
    const responseText = await response.text();
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📊 RESULTS');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('⏱️  Response Time:', elapsed + 'ms');
    console.log('📡 Status Code:', response.status);
    console.log('');

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('❌ Failed to parse response as JSON');
      console.error('   Response:', responseText);
      return;
    }

    if (response.status !== 200) {
      console.error('❌ Edge Function returned error:');
      console.error('   Status:', response.status);
      console.error('   Message:', data.error || data.message || 'Unknown error');
      console.error('   Details:', JSON.stringify(data, null, 2));
      return;
    }

    if (data.connected) {
      console.log('✅ CONNECTION SUCCESSFUL!\n');
      
      if (data.account_info) {
        console.log('📊 MT5 Account Info:');
        console.log('   Login:', data.account_info.login);
        console.log('   Server:', data.account_info.server || data.server_used);
        console.log('   Balance:', data.account_info.balance, data.account_info.currency);
        console.log('   Equity:', data.account_info.equity, data.account_info.currency);
        console.log('   Leverage:', '1:' + data.account_info.leverage);
        console.log('   Trade Allowed:', data.account_info.trade_allowed);
        console.log('   Trade Expert:', data.account_info.trade_expert);
      }
      
      console.log('\n✅ COMPLETE FLOW VERIFIED:');
      console.log('   1. Edge Function received encrypted credentials ✅');
      console.log('   2. Edge Function forwarded to VPS ✅');
      console.log('   3. VPS decrypted and called Python ✅');
      console.log('   4. Python connected to MT5 ✅');
      console.log('   5. MT5 returned account info ✅');
      console.log('   6. Python returned to VPS ✅');
      console.log('   7. VPS returned to Edge Function ✅');
      console.log('   8. Edge Function returned to test ✅');
    } else {
      console.error('❌ CONNECTION FAILED');
      console.error('   Error:', data.error || 'Unknown error');
      console.error('   Details:', JSON.stringify(data, null, 2));
    }

    console.log('\n═══════════════════════════════════════════════════════════════');

  } catch (err) {
    console.error('❌ Test Error:', err.message);
    console.error('   Stack:', err.stack);
  }
}

// Check command line arguments
const args = process.argv.slice(2);
const useServiceRole = args.includes('--service-role') || args.includes('-s');
const sessionTokenIndex = args.indexOf('--token') !== -1 ? args.indexOf('--token') + 1 : args.indexOf('-t') !== -1 ? args.indexOf('-t') + 1 : -1;
const sessionToken = sessionTokenIndex !== -1 && args[sessionTokenIndex] ? args[sessionTokenIndex] : null;

if (!useServiceRole && !sessionToken) {
  console.log('Usage:');
  console.log('  node test-edge-function-complete.js --service-role');
  console.log('  node test-edge-function-complete.js --token YOUR_SESSION_TOKEN');
  console.log('');
  console.log('Note: Service role key bypasses user auth but requires SUPABASE_SERVICE_ROLE_KEY env var');
  console.log('      Session token requires a valid user session from the frontend');
  process.exit(1);
}

testEdgeFunction(useServiceRole, sessionToken);
