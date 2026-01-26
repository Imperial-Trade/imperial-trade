/**
 * Direct Edge Function Test
 * Tests the complete flow starting from Edge Function
 */

const https = require('https');
const crypto = require('crypto');

// Configuration
const SUPABASE_URL = 'https://kmuoqkcxguafxulqlbmi.supabase.co';
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/test-broker-connection`;

// You need to provide a valid session token from the browser
// Get it from: Browser DevTools → Application → Local Storage → sb-<project-id>-auth-token → access_token
const SESSION_TOKEN = process.env.SESSION_TOKEN || 'YOUR_SESSION_TOKEN_HERE';
const ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2MDI5NjYsImV4cCI6MjA3MzE3ODk2Nn0.test';

// Test credentials
const TEST_CREDENTIALS = {
  login: '800107112',
  password: 'Demo@123',
  server: 'ECMarketsLtd-Demo',
  broker_type: 'ecmarkets'
};

// Encryption secret
const ENCRYPTION_SECRET = 'ImperialTrade_BrokerEncryption_2025_v1';

/**
 * Encrypt credentials (needs actual user ID from session)
 */
async function encryptCredentials(plaintext, userId) {
  const keyMaterial = `${userId}-${ENCRYPTION_SECRET}`;
  const keyData = Buffer.from(keyMaterial, 'utf8');
  const keyHash = crypto.createHash('sha256').update(keyData).digest();
  
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyHash, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  const authTag = cipher.getAuthTag();
  const combined = Buffer.concat([iv, encrypted, authTag]);
  
  return combined.toString('base64');
}

/**
 * Make HTTPS request
 */
function makeRequest(url, options, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = https.request(requestOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode, headers: res.headers, body });
      });
    });

    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

/**
 * Get user ID from session token
 */
async function getUserIdFromToken(token) {
  // For testing, we'll use a test user ID
  // In production, you'd decode the JWT to get the user ID
  return 'test-user-id-for-edge-function-test';
}

/**
 * Test Edge Function
 */
async function testEdgeFunction() {
  console.log('🧪 Testing Edge Function → VPS → MT5 Flow');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (SESSION_TOKEN === 'YOUR_SESSION_TOKEN_HERE') {
    console.error('❌ Please provide a valid session token:');
    console.error('   1. Open Journal XX Pro in browser');
    console.error('   2. Log in to your account');
    console.error('   3. Open DevTools → Application → Local Storage');
    console.error('   4. Find sb-<project-id>-auth-token → copy access_token');
    console.error('   5. Run: export SESSION_TOKEN="your-token"');
    console.error('   6. Run: node test-edge-function-direct-now.js');
    return;
  }

  try {
    // Get user ID (simplified for testing)
    const userId = await getUserIdFromToken(SESSION_TOKEN);
    console.log('✅ Using user ID:', userId.substring(0, 20) + '...\n');

    // Encrypt credentials
    console.log('🔐 Encrypting credentials...');
    const encryptedLogin = await encryptCredentials(TEST_CREDENTIALS.login, userId);
    const encryptedPassword = await encryptCredentials(TEST_CREDENTIALS.password, userId);
    const encryptedServer = await encryptCredentials(TEST_CREDENTIALS.server, userId);
    console.log('✅ Credentials encrypted\n');

    // Prepare request
    const requestBody = {
      broker_type: TEST_CREDENTIALS.broker_type,
      encrypted_login: encryptedLogin,
      encrypted_password: encryptedPassword,
      encrypted_server: encryptedServer
    };

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SESSION_TOKEN}`,
      'apikey': ANON_KEY
    };

    console.log('📡 Calling Edge Function: test-broker-connection');
    console.log('   URL:', EDGE_FUNCTION_URL);
    console.log('   Broker Type:', TEST_CREDENTIALS.broker_type);
    console.log('   Login:', TEST_CREDENTIALS.login);
    console.log('   Server:', TEST_CREDENTIALS.server);
    console.log('');

    const startTime = Date.now();
    const response = await makeRequest(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers
    }, requestBody);
    const elapsed = Date.now() - startTime;

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📊 RESULTS');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('⏱️  Response Time:', elapsed + 'ms');
    console.log('📡 Status Code:', response.status);
    console.log('');

    let data;
    try {
      data = JSON.parse(response.body);
    } catch (e) {
      console.error('❌ Failed to parse response as JSON');
      console.error('   Response:', response.body);
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

testEdgeFunction();
