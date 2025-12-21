/**
 * Script to delete all trades from the database
 * This will delete all trades for the authenticated user
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kmuoqkcxguafxulqlbmi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2MDI5NjYsImV4cCI6MjA3MzE3ODk2Nn0.m6vaoaT7X7VvcKaY3W3aVEi5ZjqitAjQAJbyYnps_sc';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function deleteAllTrades() {
  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ Error: Not authenticated. Please log in first.');
      console.error('   Run this script from the browser console while logged in.');
      return;
    }
    
    console.log(`🔍 Fetching all trades for user: ${user.id}...`);
    
    // Fetch all trades first to show what we're deleting
    const { data: trades, error: fetchError } = await supabase
      .from('trade_journal_entries')
      .select('id, asset_ticker, pnl, trade_date, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (fetchError) {
      console.error('❌ Error fetching trades:', fetchError);
      return;
    }
    
    if (!trades || trades.length === 0) {
      console.log('✅ No trades found. Database is already empty.');
      return;
    }
    
    console.log(`\n📊 Found ${trades.length} trade(s) to delete:`);
    trades.forEach((trade, index) => {
      const pnlSign = trade.pnl >= 0 ? '+' : '';
      console.log(`  ${index + 1}. ${trade.asset_ticker} - ${pnlSign}$${Math.abs(trade.pnl).toFixed(2)} - ${trade.trade_date}`);
    });
    
    console.log('\n🗑️  Deleting all trades...');
    
    // Delete all trades for this user
    const { error: deleteError } = await supabase
      .from('trade_journal_entries')
      .delete()
      .eq('user_id', user.id);
    
    if (deleteError) {
      console.error('❌ Error deleting trades:', deleteError);
      return;
    }
    
    console.log(`\n✅ Successfully deleted ${trades.length} trade(s)!`);
    console.log('✅ Your journal is now reset - ready for fresh start!');
    console.log('\n🔄 Please refresh your browser to see the changes.');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the script
deleteAllTrades();

