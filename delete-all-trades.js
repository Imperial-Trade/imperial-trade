/**
 * Script to delete all trades from the database
 * Run this with: node delete-all-trades.js
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kmuoqkcxguafxulqlbmi.supabase.co';
// Using anon key - will only delete trades for authenticated user
// For admin deletion, you'd need service role key
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2MDI5NjYsImV4cCI6MjA3MzE3ODk2Nn0.m6vaoaT7X7VvcKaY3W3aVEi5ZjqitAjQAJbyYnps_sc';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function deleteAllTrades() {
  try {
    console.log('🔍 Fetching all trades...');
    
    // First, get all trades to see what we're deleting
    const { data: trades, error: fetchError } = await supabase
      .from('trade_journal_entries')
      .select('id, asset_ticker, pnl, trade_date');
    
    if (fetchError) {
      console.error('❌ Error fetching trades:', fetchError);
      return;
    }
    
    if (!trades || trades.length === 0) {
      console.log('✅ No trades found. Database is already empty.');
      return;
    }
    
    console.log(`📊 Found ${trades.length} trade(s) to delete:`);
    trades.forEach((trade, index) => {
      console.log(`  ${index + 1}. ${trade.asset_ticker} - ${trade.pnl >= 0 ? '+' : ''}$${trade.pnl} - ${trade.trade_date}`);
    });
    
    // Delete all trades
    console.log('\n🗑️  Deleting all trades...');
    const { error: deleteError } = await supabase
      .from('trade_journal_entries')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (using neq with impossible ID)
    
    if (deleteError) {
      console.error('❌ Error deleting trades:', deleteError);
      return;
    }
    
    console.log(`✅ Successfully deleted ${trades.length} trade(s)!`);
    console.log('✅ Database is now empty. Ready for fresh start!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the script
deleteAllTrades();

