/**
 * Quick Live Price Checker
 * Verifies MetaAPI prices are being written to Supabase
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://kmuoqkcxguafxulqlbmi.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY');
  console.error('Set it as environment variable or in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLivePrices() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('     LIVE PRICE VERIFICATION');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    // Check recent prices
    const { data: prices, error } = await supabase
      .from('market_prices')
      .select('symbol, mid, bid, ask, updated_at')
      .order('updated_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ Database error:', error.message);
      return;
    }

    if (!prices || prices.length === 0) {
      console.log('⚠️  No prices found in database');
      console.log('   This means the MetaAPI worker is not running or not writing prices');
      console.log('\n📋 Next steps:');
      console.log('   1. Deploy index.js to DigitalOcean');
      console.log('   2. Set META_API_TOKEN and META_API_ACCOUNT_ID');
      console.log('   3. Check worker logs');
      return;
    }

    console.log('📊 Recent Prices:\n');
    
    const now = new Date();
    prices.forEach(price => {
      const age = Math.round((now - new Date(price.updated_at)) / 1000);
      const ageStatus = age < 10 ? '✅' : age < 60 ? '⚠️' : '❌';
      
      console.log(`${ageStatus} ${price.symbol.padEnd(8)} | Mid: ${(price.mid || 'N/A').toString().padEnd(12)} | Age: ${age}s`);
    });

    // Check if prices are fresh
    const latest = prices[0];
    const latestAge = Math.round((now - new Date(latest.updated_at)) / 1000);
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    
    if (latestAge < 10) {
      console.log('✅ LIVE PRICES ARE WORKING!');
      console.log(`   Latest update: ${latestAge} seconds ago`);
      console.log(`   Symbol: ${latest.symbol}`);
    } else if (latestAge < 60) {
      console.log('⚠️  PRICES ARE STALE');
      console.log(`   Latest update: ${latestAge} seconds ago`);
      console.log('   Worker may be slow or disconnected');
    } else {
      console.log('❌ PRICES ARE NOT UPDATING');
      console.log(`   Latest update: ${latestAge} seconds ago`);
      console.log('   Worker is likely not running');
    }

    // Check target symbols
    const targetSymbols = ['XAUUSD', 'BTCUSD', 'U30USD', 'SPXUSD', 'NDXUSD'];
    const foundSymbols = prices.map(p => p.symbol);
    const missingSymbols = targetSymbols.filter(s => !foundSymbols.includes(s));
    
    if (missingSymbols.length > 0) {
      console.log(`\n⚠️  Missing symbols: ${missingSymbols.join(', ')}`);
      console.log('   Worker may not be subscribed to all symbols');
    } else {
      console.log(`\n✅ All target symbols present: ${targetSymbols.join(', ')}`);
    }

    console.log('═══════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error checking prices:', error.message);
    console.error(error.stack);
  }
}

checkLivePrices();
