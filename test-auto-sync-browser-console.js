/**
 * Browser Console Script to Test Auto-Sync Journal
 * 
 * Instructions:
 * 1. Open http://localhost:8080/dashboard/journal-xx-pro
 * 2. Log in to your account
 * 3. Open browser console (F12)
 * 4. Paste this entire script and press Enter
 * 5. The script will add the PU Prime broker connection
 */

(async function testAutoSync() {
  console.log('🧪 Starting Auto-Sync Test...\n');
  
  // PU Prime Credentials
  const credentials = {
    login: '18448879',
    password: 'wb6V8e^t',
    server: 'PUPrime-Live4',
    broker: 'PU_PRIME'
  };
  
  try {
    // 1. Check if user is logged in
    const { data: { user }, error: authError } = await window.supabase.auth.getUser();
    if (authError || !user) {
      console.error('❌ Not logged in. Please log in first.');
      return;
    }
    console.log('✅ User logged in:', user.email);
    
    // 2. Import encryption utilities (they should be available in the app)
    // Note: This assumes the encryption functions are available globally
    // If not, we'll need to use the Supabase client directly
    
    // 3. Encrypt credentials
    console.log('\n🔐 Encrypting credentials...');
    const { encryptCredentials, hashCredentials } = await import('/src/utils/encryption.ts');
    
    const encryptedLogin = await encryptCredentials(credentials.login);
    const encryptedPassword = await encryptCredentials(credentials.password);
    const encryptedServer = await encryptCredentials(credentials.server);
    const credentialsHash = await hashCredentials(
      credentials.login,
      credentials.password,
      credentials.server
    );
    
    console.log('✅ Credentials encrypted');
    
    // 4. Save broker connection
    console.log('\n💾 Saving broker connection...');
    const { data: connection, error: dbError } = await window.supabase
      .from('broker_connections')
      .upsert({
        user_id: user.id,
        broker_type: credentials.broker,
        encrypted_login: encryptedLogin,
        encrypted_password: encryptedPassword,
        encrypted_server: encryptedServer,
        credentials_hash: credentialsHash,
        is_active: true,
        last_sync_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,broker_type'
      })
      .select()
      .single();
    
    if (dbError) {
      console.error('❌ Failed to save connection:', dbError);
      return;
    }
    
    console.log('✅ Broker connection saved:', connection.id);
    
    // 5. Test connection via Edge Function
    console.log('\n🔌 Testing broker connection...');
    const { data: testResult, error: testError } = await window.supabase.functions.invoke('test-broker-connection', {
      body: {
        broker_type: credentials.broker,
        encrypted_login: encryptedLogin,
        encrypted_password: encryptedPassword,
        encrypted_server: encryptedServer
      }
    });
    
    if (testError) {
      console.error('❌ Connection test failed:', testError);
      return;
    }
    
    if (!testResult || !testResult.connected) {
      console.error('❌ Connection failed:', testResult?.message);
      return;
    }
    
    console.log('✅ Connection test successful!');
    
    // 6. Check for existing synced trades
    console.log('\n📊 Checking for synced trades...');
    const { data: trades, error: tradesError } = await window.supabase
      .from('trade_journal_entries')
      .select('*')
      .eq('user_id', user.id)
      .not('broker_trade_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (tradesError) {
      console.error('❌ Failed to fetch trades:', tradesError);
    } else {
      console.log(`✅ Found ${trades?.length || 0} synced trades`);
      if (trades && trades.length > 0) {
        console.log('Recent trades:');
        trades.forEach(trade => {
          console.log(`  - ${trade.asset_ticker}: ${trade.pnl > 0 ? '+' : ''}${trade.pnl.toFixed(2)} (${trade.trade_date})`);
        });
      }
    }
    
    console.log('\n✅ Auto-Sync Test Complete!');
    console.log('\n📋 Next Steps:');
    console.log('1. Wait 30-60 seconds for auto-sync to run');
    console.log('2. Check Journal XX Pro for synced trades');
    console.log('3. Monitor VPS logs: pm2 logs "Imperial Broker Service"');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack:', error.stack);
  }
})();


