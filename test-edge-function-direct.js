/**
 * Direct Test of Edge Function → VPS → MT5 Flow
 * 
 * This tests the Edge Function directly (not through frontend)
 * to verify the complete flow works end-to-end
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Get Supabase URL and anon key from environment or hardcode
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kmuoqkcxguafxulqlbmi.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'YOUR_ANON_KEY_HERE';

// Test credentials (these should be encrypted)
const TEST_CREDENTIALS = {
  login: '800107112',
  password: 'Demo@123',
  server: 'ECMarketsLtd-Demo',
  broker_type: 'ecmarkets'
};

// Encryption secret (must match frontend/VPS)
const ENCRYPTION_SECRET = 'ImperialTrade_BrokerEncryption_2025_v1';

/**
 * Encrypt credentials using same method as frontend
 */
async function encryptCredentials(plaintext, userId) {
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
 * Test Edge Function directly
 */
async function testEdgeFunction() {
  console.log('🧪 Testing Edge Function → VPS → MT5 Flow');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Get user session (you need to be logged in)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('❌ No active session. Please log in first.');
      console.error('   Run this from the browser console after logging in, or');
      console.error('   Use Supabase service role key for testing.');
      return;
    }

    const userId = session.user.id;
    console.log('✅ User session found:', userId.substring(0, 8) + '...\n');

    // Encrypt credentials
    console.log('🔐 Encrypting credentials...');
    const encryptedLogin = await encryptCredentials(TEST_CREDENTIALS.login, userId);
    const encryptedPassword = await encryptCredentials(TEST_CREDENTIALS.password, userId);
    const encryptedServer = await encryptCredentials(TEST_CREDENTIALS.server, userId);
    console.log('✅ Credentials encrypted\n');

    // Call Edge Function directly
    console.log('📡 Calling Edge Function: test-broker-connection');
    console.log('   Broker Type:', TEST_CREDENTIALS.broker_type);
    console.log('   Login:', TEST_CREDENTIALS.login);
    console.log('   Server:', TEST_CREDENTIALS.server);
    console.log('');

    const startTime = Date.now();
    
    const { data, error } = await supabase.functions.invoke('test-broker-connection', {
      body: {
        broker_type: TEST_CREDENTIALS.broker_type,
        encrypted_login: encryptedLogin,
        encrypted_password: encryptedPassword,
        encrypted_server: encryptedServer
      }
    });

    const elapsed = Date.now() - startTime;

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📊 RESULTS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    if (error) {
      console.error('❌ Edge Function Error:');
      console.error('   Message:', error.message);
      console.error('   Details:', error);
      console.error('\n⏱️  Response Time:', elapsed + 'ms');
      return;
    }

    if (!data) {
      console.error('❌ No data returned from Edge Function');
      console.error('\n⏱️  Response Time:', elapsed + 'ms');
      return;
    }

    console.log('✅ Edge Function Response Received');
    console.log('⏱️  Response Time:', elapsed + 'ms\n');

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
      console.log('   3. VPS decrypted and connected to MT5 ✅');
      console.log('   4. MT5 returned account info ✅');
      console.log('   5. VPS returned to Edge Function ✅');
      console.log('   6. Edge Function returned to test ✅');
    } else {
      console.error('❌ CONNECTION FAILED');
      console.error('   Error:', data.error || 'Unknown error');
      console.error('   Details:', data);
    }

    console.log('\n═══════════════════════════════════════════════════════════════');

  } catch (err) {
    console.error('❌ Test Error:', err);
    console.error('   Stack:', err.stack);
  }
}

// Run test
testEdgeFunction();
