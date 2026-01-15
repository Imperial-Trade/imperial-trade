/**
 * Auto-Sync Journal Service
 * 
 * Continuously syncs trades from MT5 brokers to Supabase
 * - Queries Supabase for active broker connections
 * - Fetches trades from MT5 via Python
 * - Sends trades to Supabase journal-ingestor endpoint
 * 
 * Similar architecture to price feeder:
 * - Runs continuously in background
 * - Syncs every 30 seconds (configurable)
 * - Handles errors gracefully
 */

import { fetchMT5Trades } from './mt5-client';
import { decryptCredentials } from './encryption';

// Environment variables - loaded dynamically to ensure dotenv has run
function getEnvVar(key: string, defaultValue: string = ''): string {
  return process.env[key] || defaultValue;
}

const SYNC_INTERVAL = parseInt(process.env.SYNC_INTERVAL || '30000'); // 30 seconds default

interface BrokerConnection {
  id: string;
  user_id: string;
  broker_type: string;
  encrypted_login: string;
  encrypted_password: string;
  encrypted_server: string;
  is_active: boolean;
  last_sync_at: string | null;
}

interface MT5Trade {
  ticket: number;
  symbol: string;
  type: number;
  volume: number;
  price_open: number;
  price_current: number;
  price_close?: number;
  sl: number;
  tp: number;
  profit: number;
  swap: number;
  commission: number;
  time: number;
  time_close?: number;
  comment?: string;
}

/**
 * Fetch active broker connections from Supabase
 */
async function fetchActiveConnections(): Promise<BrokerConnection[]> {
  const SUPABASE_URL = getEnvVar('SUPABASE_URL');
  const SUPABASE_SERVICE_KEY = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.warn('⚠️  Cannot fetch connections: Missing Supabase configuration');
    return [];
  }
  
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/broker_connections?is_active=eq.true&select=*`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Failed to fetch connections: ${response.status} ${response.statusText} - ${errorText}`);
      return [];
    }

    const connections = await response.json();
    return Array.isArray(connections) ? connections : [];
  } catch (error) {
    console.error('❌ Error fetching broker connections:', error);
    return [];
  }
}

/**
 * Transform MT5 trade to journal entry format
 */
function transformTradeToJournal(trade: MT5Trade, connection: BrokerConnection, accountBalance: number) {
  const entryTime = new Date(trade.time * 1000);
  const exitTime = trade.time_close ? new Date(trade.time_close * 1000) : null;
  
  const pnlPercent = accountBalance > 0 
    ? (trade.profit / accountBalance) * 100 
    : 0;

  return {
    user_id: connection.user_id,
    asset_ticker: trade.symbol,
    trade_type: trade.type === 0 ? 'Long' : 'Short',
    position_size: trade.volume,
    entry_price: trade.price_open,
    exit_price: trade.price_close || trade.price_current,
    stop_loss: trade.sl > 0 ? trade.sl : null,
    take_profit: trade.tp > 0 ? trade.tp : null,
    pnl: trade.profit,
    pnl_percent: pnlPercent,
    commission: trade.commission || 0,
    swap_fees: trade.swap || 0,
    trade_date: entryTime.toISOString().split('T')[0],
    entry_time: entryTime.toISOString(),
    exit_time: exitTime ? exitTime.toISOString() : null,
    broker_trade_id: trade.ticket.toString(),
    broker_connection_id: connection.id,
    is_synced: true,
    sync_source: 'auto_sync',
    notes: trade.comment || null
  };
}

/**
 * Send trades to Supabase journal-ingestor
 */
async function sendTradesToSupabase(trades: any[], connectionId: string): Promise<boolean> {
  const SUPABASE_URL = getEnvVar('SUPABASE_URL');
  const INGEST_SECRET = getEnvVar('INGEST_SECRET');
  const JOURNAL_INGESTOR_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/journal-ingestor` : '';
  
  if (!JOURNAL_INGESTOR_URL || !INGEST_SECRET) {
    console.warn('⚠️  Cannot send trades: Missing Supabase configuration');
    return false;
  }
  
  try {
    const response = await fetch(JOURNAL_INGESTOR_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-INGEST-KEY': INGEST_SECRET
      },
      body: JSON.stringify({
        connection_id: connectionId,
        trades: trades
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Failed to send trades to Supabase: ${response.status} - ${errorText}`);
      return false;
    }

    const result = await response.json();
    console.log(`✅ Sent ${trades.length} trades to Supabase for connection ${connectionId}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending trades to Supabase:', error);
    return false;
  }
}

/**
 * Update last_sync_at timestamp in Supabase
 */
async function updateLastSync(connectionId: string, success: boolean, error?: string) {
  const SUPABASE_URL = getEnvVar('SUPABASE_URL');
  const SUPABASE_SERVICE_KEY = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.warn('⚠️  Cannot update sync status: Missing Supabase configuration');
    return;
  }
  
  try {
    const updateData: any = {};
    if (success) {
      updateData.last_sync_at = new Date().toISOString();
      updateData.last_error = null;
    } else {
      updateData.last_error = error || 'Sync failed';
    }

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/broker_connections?id=eq.${connectionId}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(updateData)
      }
    );

    if (!response.ok) {
      console.error(`❌ Failed to update last_sync_at: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Error updating last_sync_at:', error);
  }
}

/**
 * Sync trades for a single broker connection
 */
async function syncConnection(connection: BrokerConnection): Promise<void> {
  try {
    console.log(`🔄 Syncing trades for connection ${connection.id} (user: ${connection.user_id})`);

    // Decrypt credentials
    const login = decryptCredentials(connection.encrypted_login, connection.user_id);
    const password = decryptCredentials(connection.encrypted_password, connection.user_id);
    const server = decryptCredentials(connection.encrypted_server, connection.user_id);

    // Fetch trades from MT5
    const result = await fetchMT5Trades({ login, password, server });

    if (result.error) {
      console.error(`❌ Error fetching trades for ${connection.id}: ${result.error}`);
      await updateLastSync(connection.id, false, result.error);
      return;
    }

    if (!result.trades || result.trades.length === 0) {
      console.log(`ℹ️ No new trades for connection ${connection.id}`);
      await updateLastSync(connection.id, true);
      return;
    }

    // Transform trades to journal format
    const journalEntries = result.trades.map((trade: MT5Trade) =>
      transformTradeToJournal(trade, connection, result.account_balance || 0)
    );

    // Send to Supabase
    const success = await sendTradesToSupabase(journalEntries, connection.id);
    
    if (success) {
      await updateLastSync(connection.id, true);
      console.log(`✅ Successfully synced ${journalEntries.length} trades for connection ${connection.id}`);
    } else {
      await updateLastSync(connection.id, false, 'Failed to send trades to Supabase');
    }
  } catch (error) {
    console.error(`❌ Error syncing connection ${connection.id}:`, error);
    await updateLastSync(connection.id, false, error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Main sync loop - runs continuously
 */
export async function startAutoSync(): Promise<void> {
  try {
    // Load environment variables dynamically (after dotenv.config() has run)
    const SUPABASE_URL = getEnvVar('SUPABASE_URL');
    const SUPABASE_SERVICE_KEY = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');
    const INGEST_SECRET = getEnvVar('INGEST_SECRET');
    const JOURNAL_INGESTOR_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/journal-ingestor` : '';
    
    console.log('🚀 Auto-Sync Journal Service starting...');
    console.log(`📊 Sync interval: ${SYNC_INTERVAL / 1000} seconds`);
    console.log(`🔗 Supabase URL: ${SUPABASE_URL || 'NOT SET'}`);
    console.log(`📡 Journal Ingestor: ${JOURNAL_INGESTOR_URL || 'NOT SET'}`);
    console.log(`🔑 INGEST_SECRET: ${INGEST_SECRET ? 'SET' : 'NOT SET'}`);
    console.log(`🔑 SUPABASE_SERVICE_KEY: ${SUPABASE_SERVICE_KEY ? 'SET' : 'NOT SET'}`);

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !INGEST_SECRET) {
      console.warn('⚠️  Auto-sync service disabled: Missing required environment variables');
      console.warn('   SUPABASE_URL:', SUPABASE_URL ? '✅' : '❌');
      console.warn('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_KEY ? '✅' : '❌');
      console.warn('   INGEST_SECRET:', INGEST_SECRET ? '✅' : '❌');
      console.warn('   Auto-sync is optional. Broker connection and trade fetching will still work.');
      console.warn('   To enable auto-sync, set these variables in .env file:');
      console.warn('   - SUPABASE_URL');
      console.warn('   - SUPABASE_SERVICE_ROLE_KEY');
      console.warn('   - INGEST_SECRET');
      return; // Exit gracefully instead of throwing error
    }

    console.log('✅ All environment variables present');

    // Initial sync
    console.log('🔄 Performing initial sync...');
    await performSync();

    // Set up interval
    console.log(`⏰ Setting up sync interval (${SYNC_INTERVAL}ms)...`);
    setInterval(async () => {
      await performSync();
    }, SYNC_INTERVAL);

    console.log('✅ Auto-Sync Journal Service running');
  } catch (error) {
    console.error('❌ Error in startAutoSync:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    throw error;
  }
}

/**
 * Perform one sync cycle
 */
async function performSync(): Promise<void> {
  try {
    console.log(`\n🔄 [${new Date().toISOString()}] Starting sync cycle...`);

    // Fetch active connections
    const connections = await fetchActiveConnections();

    if (connections.length === 0) {
      console.log('ℹ️ No active broker connections found');
      return;
    }

    console.log(`📋 Found ${connections.length} active broker connection(s)`);

    // Sync each connection sequentially (to avoid overwhelming MT5)
    for (const connection of connections) {
      await syncConnection(connection);
      // Small delay between connections
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log(`✅ Sync cycle completed at ${new Date().toISOString()}`);
  } catch (error) {
    console.error('❌ Error in sync cycle:', error);
  }
}

