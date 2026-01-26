import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw, CheckCircle, AlertCircle, Clock, TrendingUp, TrendingDown, Check, LogOut, XCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { classifyTradeDuration, TradeDurationCategory } from './utils/tradeDurationClassifier';
import { useToast } from '@/hooks/use-toast';
import { encryptCredentials, hashCredentials } from '@/utils/encryption';
import { useTradeJournalEntries } from '@/hooks/useTradeJournalEntries';
import { TradeEntry } from './types';
import { PnLChart } from './PnLChart';

// Broker options with accurate MT5 server names
// These match exactly what appears in MT5 terminal when selecting a server
const BROKERS = [
  {
    id: 'xs',
    name: 'XS.com',
    description: 'Global multi-asset broker with competitive spreads',
    defaultServer: 'XSFintech-REAL-1', // Most common live server
    servers: [
      'XSFintech-REAL-1',
      'XSFintech-REAL-2',
      'XSFintech-REAL-3',
      'XSMarkets-REAL-1',
      'XSFintech-DEMO',
      'XSMarkets-DEMO'
    ],
  },
  {
    id: 'ecmarkets',
    name: 'EC Markets',
    description: 'Premium forex and CFD broker',
    defaultServer: 'ECMarketsLtd-Demo', // Default for demo accounts
    servers: [
      'ECMarketsLtd-Demo',
      'ECMarkets-MT5-Live01',
      'ECMarketsLtd-MT5-Live02',
      'ECMarketsLtd-MT5-Live03',
      'ECMarketsNZ-MT5-Live04'
    ],
  },
];

interface AutoJournalViewProps {
  isDarkMode: boolean;
  onDisconnect?: () => void;
}

interface BrokerConnection {
  id: string;
  broker_type: string;
  broker_name: string;
  account_id: string;
  is_active: boolean;
  last_sync_at: string | null;
}

interface SyncedTrade {
  id: string;
  asset_ticker: string;
  trade_type: string;
  pnl: number;
  entry_price?: number;
  exit_price?: number;
  position_size?: number;
  trade_date: string;
  open_time?: string;
  close_time?: string;
}

export const AutoJournalView: React.FC<AutoJournalViewProps> = ({ isDarkMode, onDisconnect }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { entries: allTrades, isLoading: tradesLoading } = useTradeJournalEntries();
  
  const [brokerConnection, setBrokerConnection] = useState<BrokerConnection | null>(null);
  const [syncedTrades, setSyncedTrades] = useState<SyncedTrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Calendar and performance curve state
  const [calendarTimeFilter, setCalendarTimeFilter] = useState<'D'|'W'|'M'|'Y'>('M');
  const [calendarViewDate, setCalendarViewDate] = useState(new Date());
  const [activeView, setActiveView] = useState<'trades' | 'calendar' | 'performance'>('trades');
  
  // Convert only AUTO (synced) trades to TradeEntry format for calendar/performance curve
  // CRITICAL: Filter to only show synced trades (is_synced = true AND broker_connection_id IS NOT NULL)
  const tradesForAnalytics = useMemo(() => {
    const autoTradesOnly = allTrades.filter(t => 
      t.is_synced === true && 
      t.broker_connection_id !== null && 
      t.broker_connection_id !== undefined &&
      t.broker_connection_id !== ''
    );
    return autoTradesOnly.map(t => ({
      id: t.id,
      date: t.trade_date || new Date().toISOString().split('T')[0],
      asset: t.asset_ticker || '',
      pnl: t.pnl || 0,
      notes: t.notes || '',
      direction: t.trade_type as 'Long' | 'Short',
      outcome: t.pnl > 0 ? 'Win' as const : t.pnl < 0 ? 'Loss' as const : 'Break Even' as const,
      entry_price: t.entry_price,
      exit_price: t.exit_price,
      position_size: t.position_size,
    })) as TradeEntry[];
  }, [allTrades]);
  
  // Broker selection and login form states
  const [selectedBroker, setSelectedBroker] = useState<string | null>(null);
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [server, setServer] = useState('');
  const [showCustomServer, setShowCustomServer] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  // Connection status state
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'connected' | 'error'>('idle');
  const [connectionStatusMessage, setConnectionStatusMessage] = useState<string>('');

  // Set default server when broker is selected
  useEffect(() => {
    if (selectedBroker && !server) {
      const broker = BROKERS.find(b => b.id === selectedBroker);
      if (broker?.defaultServer) {
        setServer(broker.defaultServer);
      }
    }
  }, [selectedBroker]);

  // Handle broker connection with connection testing
  const handleConnect = async () => {
    if (!user || !selectedBroker || !loginId || !password || !server) return;
    
    setIsConnecting(true);
    setConnectError(null);
    setConnectionStatus('testing');
    setConnectionStatusMessage('Testing connection...');
    
    try {
      // Verify user session is valid before making Edge Function call
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        console.error('❌ Session error:', sessionError);
        throw new Error('Session expired. Please refresh the page and try again.');
      }
      
      console.log('✅ User session valid:', { userId: user.id, hasSession: !!session });
      
      // Map frontend broker ID to database enum value
      const brokerTypeMap: Record<string, string> = {
        'xs': 'XS',
        'ecmarkets': 'EC_MARKETS'
      };
      const dbBrokerType = brokerTypeMap[selectedBroker];
      
      if (!dbBrokerType) {
        throw new Error('Invalid broker type selected');
      }
      
      // Encrypt credentials using AES-256-GCM (production-ready)
      const encryptedLogin = await encryptCredentials(loginId);
      const encryptedPassword = await encryptCredentials(password);
      const encryptedServer = await encryptCredentials(server);
      
      // STEP 1: Test connection first using test-broker-connection Edge Function
      setConnectionStatusMessage('Testing connection to MT5...');
      console.log('🔍 Testing connection via test-broker-connection Edge Function');
      
      const { data: testResult, error: testError } = await supabase.functions.invoke('test-broker-connection', {
        body: {
          broker_type: selectedBroker, // Use frontend broker ID (xs, ecmarkets)
          encrypted_login: encryptedLogin,
          encrypted_password: encryptedPassword,
          encrypted_server: encryptedServer
        }
      });
      
      if (testError) {
        console.error('❌ Connection test error:', testError);
        throw new Error(testError.message || 'Failed to test connection');
      }
      
      if (!testResult || !testResult.connected) {
        const errorMessage = testResult?.error || 'Connection test failed. Please verify your credentials.';
        console.error('❌ Connection test failed:', errorMessage);
        throw new Error(errorMessage);
      }
      
      console.log('✅ Connection test successful:', {
        server_used: testResult.server_used,
        account_info: testResult.account_info
      });
      
      // STEP 2: Connection test succeeded - save credentials to database
      setConnectionStatusMessage('Saving credentials...');
      console.log('💾 Saving credentials to database:', {
        broker_type: dbBrokerType,
        user_id: user.id,
        server_used: testResult.server_used
      });
      
      const credentialsHash = await hashCredentials(loginId, password, server);
      
      const { data: connection, error: saveError } = await supabase
        .from('broker_connections')
        .insert({
          user_id: user.id,
          broker_type: dbBrokerType,
          encrypted_login: encryptedLogin,
          encrypted_password: encryptedPassword,
          encrypted_server: encryptedServer,
          credentials_hash: credentialsHash,
          is_active: true,
          connection_status: 'connected', // Set to connected since test succeeded
          is_syncing: false, // Ready to be picked up by Go Brain
          sync_priority: 1, // High priority for immediate sync by Go Brain
        })
        .select()
        .single();
      
      if (saveError) {
        if (saveError.code === '23505') {
          throw new Error('You already have a connection for this broker. Please disconnect it first.');
        }
        throw new Error(saveError.message);
      }

      setConnectionStatus('connected');
      setConnectionStatusMessage('Connection successful. Fetching trade history...');
      
      toast({
        title: 'Broker Connected',
        description: `Successfully connected to ${testResult.server_used || server}. Account: ${testResult.account_info?.login || loginId}`,
        duration: 5000,
      });
      
      // STEP 3: Auto-sync trades after successful connection
      if (connection) {
        const connectionId = connection.id;
        if (connectionId) {
          try {
            console.log('🔄 Auto-syncing trade history...');
            const { data: syncData, error: syncError } = await supabase.functions.invoke('sync-broker-trades', {
              body: { connection_id: connectionId }
            });
            
            if (syncError) {
              console.error('⚠️ Auto-sync error (connection still saved):', syncError);
              // Don't throw - connection is saved, just sync failed
            } else if (syncData?.success) {
              const tradesCount = syncData.trades_synced || 0;
              console.log('✅ Auto-sync successful:', {
                trades_synced: tradesCount
              });
              await fetchSyncedTrades();
              setConnectionStatusMessage('Connected and synced');

              if (tradesCount === 0) {
                toast({
                  title: 'Sync Complete',
                  description: 'No trades found in your MT5 account. Your account appears to have no trading history.',
                  duration: 5000,
                });
              } else {
                toast({
                  title: 'Sync Complete',
                  description: `Successfully synced ${tradesCount} trade${tradesCount !== 1 ? 's' : ''} from your broker`,
                  duration: 3000,
                });
              }
            }
            
            // Refresh broker connection to get updated last_sync_at
            await fetchBrokerConnection();
          } catch (err) {
            console.error('⚠️ Auto-sync error (connection still saved):', err);
            // Don't throw - connection is saved, just sync failed
          }
        }
      }
      
      // Clear form ONLY after broker connection state is updated
      setLoginId('');
      setPassword('');
      setServer('');
      setShowCustomServer(false);
      setSelectedBroker(null);
      setConnectionStatus('idle');
      setConnectionStatusMessage('');
      
    } catch (err: any) {
      setConnectionStatus('error');
      const errorMsg = err.message || 'Failed to connect broker';
      setConnectionStatusMessage(errorMsg);
      setConnectError(errorMsg);
      toast({
        title: 'Connection Failed',
        description: errorMsg,
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setIsConnecting(false);
    }
  };

  // Fetch broker connection
  const fetchBrokerConnection = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('broker_connections')
        .select('id, broker_type, is_active, last_sync_at, last_error, connection_status')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle(); // Use maybeSingle() instead of single() to handle no rows gracefully
      
      if (error) {
        console.error('Error fetching broker connection:', error);
        return;
      }
      
      if (data) {
        setBrokerConnection({
          ...data,
          broker_name: data.broker_type,
          account_id: data.id.substring(0, 8) + '...',
        });
        if (data.last_sync_at) {
          setLastSyncTime(new Date(data.last_sync_at));
        }
        
        // Handle connection status with priority: error (failed or has error) > connecting > pending > connected
        const status = data.connection_status || 'pending';
        if (status === 'failed' || data.last_error) {
          // Always show error if status is 'failed' OR if there's an error message (even if status is 'connecting')
          setConnectionStatus('error');
          setError(data.last_error || 'Connection failed');
          setConnectionStatusMessage(data.last_error || 'Connection failed');
        } else if (status === 'connecting') {
          setConnectionStatus('testing');
          setError(null);
          setConnectionStatusMessage('Connecting to MT5...');
        } else if (status === 'pending') {
          setConnectionStatus('testing');
          setError(null);
          setConnectionStatusMessage('Waiting for Go Brain to process...');
        } else if (status === 'connected' && data.last_sync_at) {
          // Only show connected if status is explicitly 'connected' AND has a sync timestamp
          setConnectionStatus('connected');
          setError(null);
          setConnectionStatusMessage('Connected and synced');
        } else {
          setConnectionStatus('idle');
          setError(null);
          setConnectionStatusMessage('');
        }
        
        // Auto-fetch trades if connection exists but no trades synced yet
        // Only if connection_status is 'connected' to ensure credentials are actually connected to MT5
        if (data.last_sync_at === null && data.id && status === 'connected' && data.connection_status === 'connected') {
          // First time connection - fetch trades
          setTimeout(async () => {
            try {
              const { data: syncData, error: syncError } = await supabase.functions.invoke('sync-broker-trades', {
                body: { connection_id: data.id }
              });
              if (!syncError && syncData?.success) {
                await fetchSyncedTrades();
                setLastSyncTime(new Date());
              }
            } catch (err) {
              console.error('Auto-sync error:', err);
            }
          }, 1000);
        }
      }
    } catch (err) {
      console.error('Error fetching broker connection:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Fetch synced trades - get ALL trades (synced and manual) for analytics
  const fetchSyncedTrades = useCallback(async () => {
    if (!user) return;
    
    try {
      // Get all trades (both synced and manual) for calendar/performance curve
      const { data, error } = await supabase
        .from('trade_journal_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('trade_date', { ascending: false });
      
      if (error) {
        console.error('Error fetching trades:', error);
        return;
      }
      
      if (data) {
        // Filter only AUTO (synced) trades for the trades list
        // CRITICAL: Only show trades that are explicitly synced (is_synced = true AND broker_connection_id IS NOT NULL)
        const syncedOnly = data.filter(t => 
          t.is_synced === true && 
          t.broker_connection_id !== null && 
          t.broker_connection_id !== undefined &&
          t.broker_connection_id !== ''
        );
        setSyncedTrades(syncedOnly.map(t => ({
          id: t.id,
          asset_ticker: t.asset_ticker,
          trade_type: t.trade_type,
          pnl: t.pnl,
          entry_price: t.entry_price,
          exit_price: t.exit_price,
          position_size: t.position_size,
          trade_date: t.trade_date,
          open_time: t.entry_time,
          close_time: t.exit_time,
        })));
      }
    } catch (err) {
      console.error('Error fetching trades:', err);
    }
  }, [user]);

  // Sync trades from broker
  const syncTrades = useCallback(async () => {
    if (!brokerConnection) {
      setError('No broker connection');
      return;
    }

    // Only sync if connection is actually connected to MT5
    const connectionStatus = brokerConnection.connection_status || 'pending';
    if (connectionStatus !== 'connected') {
      console.warn('⏸️ Sync skipped: Connection not connected to MT5 (status:', connectionStatus + ')');
      setError(`Cannot sync: Connection status is '${connectionStatus}'. Please ensure the connection is connected to MT5.`);
      return;
    }

    setIsSyncing(true);
    setError(null);
    
    console.log('🔄 Starting trade sync for connection:', brokerConnection.id);

    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/e4abfb33-7c1e-45fb-8358-9f8438efaa01',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AutoJournalView.tsx:387',message:'syncTrades: Before invoke',data:{connection_id:brokerConnection.id,broker_type:brokerConnection.broker_type,has_connection:!!brokerConnection},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C,D,E'})}).catch(()=>{});
      // #endregion
      const { data, error: syncError } = await supabase.functions.invoke('sync-broker-trades', {
        body: {
          connection_id: brokerConnection.id
        }
      });

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/e4abfb33-7c1e-45fb-8358-9f8438efaa01',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AutoJournalView.tsx:395',message:'syncTrades: After invoke',data:{has_data:!!data,has_error:!!syncError,error_type:syncError?.constructor?.name,error_message:syncError?.message,error_code:syncError?.code,error_details:syncError?.details,data_success:data?.success,data_error:data?.error},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C,D,E'})}).catch(()=>{});
      // #endregion

      if (syncError) {
        console.error('❌ Sync error:', syncError);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/e4abfb33-7c1e-45fb-8358-9f8438efaa01',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AutoJournalView.tsx:399',message:'syncTrades: syncError exists',data:{error_message:syncError?.message,error_code:syncError?.code,error_name:syncError?.name,error_stack:syncError?.stack?.substring(0,200),full_error:JSON.stringify(syncError)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C,D,E'})}).catch(()=>{});
        // #endregion
        throw syncError;
      }

      if (!data || !data.success) {
        const errorMsg = data?.error || data?.details || 'Sync failed';
        console.error('❌ Sync failed:', errorMsg);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/e4abfb33-7c1e-45fb-8358-9f8438efaa01',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AutoJournalView.tsx:406',message:'syncTrades: data.success is false',data:{data_success:data?.success,data_error:data?.error,data_details:data?.details,errorMsg},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B,C,D'})}).catch(()=>{});
        // #endregion
        throw new Error(errorMsg);
      }

      const tradesCount = data.trades_synced || 0;
      setLastSyncTime(new Date());
      
      console.log(`✅ Sync complete: ${tradesCount} trades synced`);

      toast({
        title: 'Sync Complete',
        description: `Successfully synced ${tradesCount} trade${tradesCount !== 1 ? 's' : ''} from your broker`,
        duration: 3000,
      });

      // Refresh trades list - this will also update calendar/performance curve via useTradeJournalEntries
      await fetchSyncedTrades();
      
      // Clear any errors on successful sync
      setError(null);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/e4abfb33-7c1e-45fb-8358-9f8438efaa01',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AutoJournalView.tsx:422',message:'syncTrades: Success path',data:{trades_synced:data.trades_synced},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'NONE'})}).catch(()=>{});
      // #endregion
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to sync trades';
      console.error('❌ Sync error details:', err);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/e4abfb33-7c1e-45fb-8358-9f8438efaa01',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AutoJournalView.tsx:426',message:'syncTrades: Catch block',data:{error_message:err?.message,error_name:err?.name,error_code:err?.code,error_status:err?.status,error_details:err?.details,error_stack:err?.stack?.substring(0,300),errorMessage},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C,D,E'})}).catch(()=>{});
      // #endregion
      setError(errorMessage);

      toast({
        title: 'Sync Failed',
        description: errorMessage,
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setIsSyncing(false);
    }
  }, [brokerConnection, toast, fetchSyncedTrades]);

  // Initial load
  useEffect(() => {
    fetchBrokerConnection();
    fetchSyncedTrades();
  }, [fetchBrokerConnection, fetchSyncedTrades]);
  
  // Realtime subscription for connection status updates (replaces polling)
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('broker-connection-status-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'broker_connections',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('📡 Realtime connection status update:', payload);
          // Refresh connection data when database changes
          fetchBrokerConnection();
        }
      )
      .subscribe((status) => {
        console.log('📡 Broker connection subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to broker connection status updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Failed to subscribe to broker connection status');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchBrokerConnection]);

  // Disconnect broker
  const handleDisconnect = async () => {
    if (!brokerConnection || !user) return;
    
    try {
      const { error } = await supabase
        .from('broker_connections')
        .update({ is_active: false })
        .eq('id', brokerConnection.id)
        .eq('user_id', user.id);
      
      if (error) {
        throw error;
      }
      
      toast({
        title: 'Broker Disconnected',
        description: 'Connection status updated. You can now connect a different broker account.',
        duration: 3000,
      });
      
      // Clear local state
      setBrokerConnection(null);
      setSyncedTrades([]);
      setLastSyncTime(null);
      
      // Refresh connection check to ensure UI updates
      await fetchBrokerConnection();
      
      // Notify parent component to reset to broker selection
      if (onDisconnect) {
        onDisconnect();
      }
    } catch (err: any) {
      toast({
        title: 'Disconnect Failed',
        description: err.message || 'Failed to disconnect broker',
        variant: 'destructive',
        duration: 5000,
      });
    }
  };

  // Auto-sync every 30 seconds if connected (for real-time updates)
  // Only sync if connection_status is 'connected' to ensure credentials are actually connected to MT5
  useEffect(() => {
    if (!brokerConnection) return;

    // Only auto-sync if connection is actually connected to MT5
    const connectionStatus = brokerConnection.connection_status || 'pending';
    if (connectionStatus !== 'connected') {
      console.log('⏸️ Auto-sync skipped: Connection not connected to MT5 (status:', connectionStatus + ')');
      return;
    }

    // Initial sync immediately when connection is established
    syncTrades();

    // Then sync every 30 seconds
    const interval = setInterval(() => {
      // Double-check connection status before each sync
      if (brokerConnection.connection_status === 'connected') {
        syncTrades();
      } else {
        console.log('⏸️ Auto-sync skipped: Connection status changed to', brokerConnection.connection_status);
      }
    }, 30 * 1000); // 30 seconds for faster updates

    return () => clearInterval(interval);
  }, [brokerConnection, syncTrades]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <RefreshCw className="w-8 h-8 animate-spin text-bronze-500 mb-4" />
        <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-stone-500'}`}>
          Loading broker connection...
        </p>
      </div>
    );
  }

  if (!brokerConnection) {
    return (
      <div className={`flex flex-col h-full p-6 md:p-8 overflow-y-auto ${isDarkMode ? 'bg-[#0a0a0a]' : 'bg-stone-50'}`}>
        {/* Header */}
        <div className="mb-6">
          <h2 className={`text-2xl md:text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>
            Connect Your Broker
          </h2>
          <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-stone-500'}`}>
            Sync your trades automatically from your MT5 broker account
          </p>
        </div>
        
        {/* Select Your Broker */}
        <h3 className={`text-sm font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>
          Select Your Broker
        </h3>
        
        {/* Broker Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {BROKERS.map((broker) => (
            <div
              key={broker.id}
              onClick={() => {
                setSelectedBroker(broker.id);
                setServer('');
                setShowCustomServer(false);
              }}
              className={`relative p-5 rounded-2xl border cursor-pointer transition-all ${
                selectedBroker === broker.id
                  ? isDarkMode 
                    ? 'border-emerald-500 bg-emerald-500/5 ring-2 ring-emerald-500/30' 
                    : 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/30'
                  : isDarkMode
                    ? 'border-white/10 bg-[#1a1a1a] hover:border-white/20'
                    : 'border-stone-200 bg-white hover:border-stone-300'
              }`}
            >
              {/* Selected checkmark */}
              {selectedBroker === broker.id && (
                <div className="absolute top-3 right-3">
                  <Check className="w-5 h-5 text-emerald-500" />
                </div>
              )}
              
              {/* Broker Name */}
              <h4 className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>
                {broker.name}
              </h4>
              
              {/* Description */}
              <p className={`text-xs mb-4 ${isDarkMode ? 'text-slate-400' : 'text-stone-500'}`}>
                {broker.description}
              </p>
              
              {/* Server Examples */}
              <div>
                <p className={`text-xs font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-stone-600'}`}>
                  Server Examples:
                </p>
                <div className={`text-xs font-mono ${isDarkMode ? 'text-slate-400' : 'text-stone-500'}`}>
                  {broker.servers.map((server, idx) => (
                    <div key={idx}>{server}</div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Login Form - appears after broker selection */}
        {selectedBroker && (
          <div className={`mt-6 p-5 rounded-2xl border ${isDarkMode ? 'border-white/10 bg-[#1a1a1a]' : 'border-stone-200 bg-white'}`}>
            <h4 className={`text-sm font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>
              Enter Your MT5 Credentials
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-stone-500'}`}>
                  MT5 Login ID
                </label>
                <input
                  type="text"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder="12345678"
                  className={`w-full px-3 py-2.5 rounded-xl text-sm border ${
                    isDarkMode 
                      ? 'bg-slate-900 border-slate-800 text-white placeholder:text-slate-600' 
                      : 'bg-stone-50 border-stone-200 text-stone-900 placeholder:text-stone-400'
                  }`}
                />
              </div>
              
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-stone-500'}`}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full px-3 py-2.5 rounded-xl text-sm border ${
                    isDarkMode 
                      ? 'bg-slate-900 border-slate-800 text-white placeholder:text-slate-600' 
                      : 'bg-stone-50 border-stone-200 text-stone-900 placeholder:text-stone-400'
                  }`}
                />
              </div>
              
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-stone-500'}`}>
                  Server <span className="text-[10px] opacity-60">(Must match MT5 exactly)</span>
                </label>
                <select
                  value={showCustomServer ? '__custom__' : server}
                  onChange={(e) => {
                    if (e.target.value === '__custom__') {
                      setShowCustomServer(true);
                      setServer('');
                    } else {
                      setShowCustomServer(false);
                      setServer(e.target.value);
                    }
                  }}
                  className={`w-full px-3 py-2.5 rounded-xl text-sm border mb-1.5 ${
                    isDarkMode 
                      ? 'bg-slate-900 border-slate-800 text-white' 
                      : 'bg-stone-50 border-stone-200 text-stone-900'
                  }`}
                >
                  <option value="">Select server...</option>
                  {selectedBroker && BROKERS.find(b => b.id === selectedBroker)?.servers.map((srv, idx) => (
                    <option key={idx} value={srv}>{srv}</option>
                  ))}
                  <option value="__custom__">Other server (enter manually)</option>
                </select>
                {showCustomServer && (
                  <input
                    type="text"
                    value={server}
                    onChange={(e) => setServer(e.target.value)}
                    placeholder="Enter exact server name from MT5"
                    className={`w-full px-3 py-2.5 rounded-xl text-sm border ${
                      isDarkMode 
                        ? 'bg-slate-900 border-slate-800 text-white placeholder:text-slate-600' 
                        : 'bg-stone-50 border-stone-200 text-stone-900 placeholder:text-stone-400'
                    }`}
                  />
                )}
                <p className={`text-[10px] mt-1 ${isDarkMode ? 'text-slate-500' : 'text-stone-400'}`}>
                  💡 Tip: Server name must match exactly as shown in MT5 terminal (case-sensitive)
                </p>
              </div>
            </div>
            
            {/* Connection Status Feedback */}
            {connectionStatus !== 'idle' && (
              <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
                connectionStatus === 'connected'
                  ? isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
                  : connectionStatus === 'error'
                  ? isDarkMode ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-100 text-rose-600'
                  : isDarkMode ? 'bg-yellow-500/10 text-yellow-400' : 'bg-yellow-100 text-yellow-600'
              }`}>
                {connectionStatus === 'testing' && <RefreshCw className="w-4 h-4 shrink-0 animate-spin" />}
                {connectionStatus === 'connected' && <CheckCircle className="w-4 h-4 shrink-0" />}
                {connectionStatus === 'error' && <XCircle className="w-4 h-4 shrink-0" />}
                <span className="text-xs">{connectionStatusMessage || connectError}</span>
              </div>
            )}
            
            {connectError && connectionStatus === 'idle' && (
              <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
                isDarkMode ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-100 text-rose-600'
              }`}>
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="text-xs">{connectError}</span>
              </div>
            )}
            
            <button
              onClick={handleConnect}
              disabled={isConnecting || !loginId || !password || !server || showCustomServer && !server}
              className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                isConnecting || !loginId || !password || !server || (showCustomServer && !server)
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-500 to-yellow-500 text-black hover:opacity-90'
              }`}
            >
              {isConnecting ? (
                <span className="flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Connecting...
                </span>
              ) : (
                'Connect Broker'
              )}
            </button>
            
            <p className={`text-[10px] mt-3 text-center ${isDarkMode ? 'text-slate-500' : 'text-stone-400'}`}>
              Your credentials are encrypted and securely stored
            </p>
          </div>
        )}
      </div>
    );
  }

  const getDurationBadge = (category: TradeDurationCategory) => {
    const badges: Record<TradeDurationCategory, { label: string; color: string }> = {
      'Scalping': { label: 'SCALP', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
      'Day Trade': { label: 'DAY', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
      'Swing Trade': { label: 'SWING', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
      'Position Trade': { label: 'POSITION', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    };
    return badges[category];
  };

  // Simple Calendar Component (simplified version of MacroCalendar)
  const SimpleCalendar: React.FC<{
    trades: TradeEntry[];
    isDarkMode: boolean;
    timeFilter: 'D'|'W'|'M'|'Y';
    setTimeFilter: (filter: 'D'|'W'|'M'|'Y') => void;
    viewDate: Date;
    setViewDate: (date: Date) => void;
  }> = ({ trades, isDarkMode, timeFilter, setTimeFilter, viewDate, setViewDate }) => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    
    // Calculate daily PnL
    const dailyPnL = useMemo(() => {
      const map: Record<string, { pnl: number, count: number }> = {};
      trades.forEach(t => {
        const dateParts = t.date.split('T')[0].split('-');
        const y = parseInt(dateParts[0], 10);
        const m = parseInt(dateParts[1], 10) - 1;
        const d = parseInt(dateParts[2], 10);
        const key = `${y}-${m}-${d}`;
        if (!map[key]) map[key] = { pnl: 0, count: 0 };
        map[key].pnl += t.pnl;
        map[key].count += 1;
      });
      return map;
    }, [trades]);

    const getCalendarDays = (y: number, m: number) => {
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      return Array.from({ length: daysInMonth }, (_, i) => i + 1);
    };

    const handleNavigation = (offset: number) => {
      const newDate = new Date(viewDate);
      if (timeFilter === 'Y') newDate.setFullYear(newDate.getFullYear() + offset);
      else if (timeFilter === 'M') newDate.setMonth(newDate.getMonth() + offset);
      else if (timeFilter === 'W') newDate.setDate(newDate.getDate() + (offset * 7));
      else newDate.setDate(newDate.getDate() + offset);
      setViewDate(newDate);
    };

    const headerDateText = useMemo(() => {
      if (timeFilter === 'Y') return viewDate.getFullYear().toString();
      if (timeFilter === 'M') return viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }).toUpperCase();
      if (timeFilter === 'D') return viewDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
      return viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }).toUpperCase();
    }, [viewDate, timeFilter]);

    const renderMonthView = () => {
      const days = getCalendarDays(year, month);
      const firstDayOfWeek = new Date(year, month, 1).getDay();
      const emptySlots = Array.from({ length: firstDayOfWeek }, (_, i) => i);
      
      return (
        <div className="grid grid-cols-7 gap-1 h-full">
          {['S','M','T','W','T','F','S'].map((d, idx) => (
            <div key={`header-${idx}`} className={`text-[8px] font-bold text-center py-2 ${isDarkMode ? 'text-slate-400' : 'text-stone-500'}`}>
              {d}
            </div>
          ))}
          {emptySlots.map(i => <div key={`empty-${i}`} />)}
          {days.map((day) => {
            const key = `${year}-${month}-${day}`;
            const data = dailyPnL[key];
            const pnl = data?.pnl || 0;
            const hasData = !!data;
            const isWin = pnl > 0;
            
            return (
              <div
                key={day}
                onClick={() => { setViewDate(new Date(year, month, day)); setTimeFilter('D'); }}
                className={`relative p-1 rounded border cursor-pointer transition-all min-h-[60px] flex flex-col ${
                  hasData
                    ? isWin
                      ? isDarkMode ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-emerald-100/80 border-emerald-200'
                      : isDarkMode ? 'bg-rose-500/20 border-rose-500/30' : 'bg-rose-100/80 border-rose-200'
                    : isDarkMode ? 'border-white/5' : 'border-stone-200'
                }`}
              >
                <span className={`text-[10px] font-bold ${hasData ? (isDarkMode ? 'text-white' : 'text-stone-900') : (isDarkMode ? 'text-slate-500' : 'text-stone-400')}`}>
                  {day}
                </span>
                {hasData && (
                  <div className="mt-auto">
                    <div className={`text-[9px] font-bold ${isWin ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {(pnl >= 0 ? '+' : '-') + '$' + Math.abs(pnl).toFixed(2)}
                    </div>
                    <div className={`text-[7px] ${isDarkMode ? 'text-slate-400' : 'text-stone-500'}`}>
                      {data.count} trade{data.count !== 1 ? 's' : ''}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    };

    return (
      <div className="h-full flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-stone-500'}`}>
            {headerDateText}
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => handleNavigation(-1)}
              className={`p-1 rounded ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-stone-100'}`}
            >
              <span className="text-xs">←</span>
            </button>
            <button
              onClick={() => handleNavigation(1)}
              className={`p-1 rounded ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-stone-100'}`}
            >
              <span className="text-xs">→</span>
            </button>
          </div>
        </div>
        <div className="flex gap-1 mb-4">
          {['D','W','M','Y'].map(t => (
            <button
              key={t}
              onClick={() => setTimeFilter(t as any)}
              className={`px-2 py-1 text-[9px] font-bold rounded ${
                timeFilter === t
                  ? isDarkMode ? 'bg-bronze-500 text-white' : 'bg-yellow-500 text-black'
                  : isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-stone-100 text-stone-600'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto">
          {timeFilter === 'M' && renderMonthView()}
          {timeFilter === 'Y' && (
            <div className={`text-center py-8 ${isDarkMode ? 'text-slate-400' : 'text-stone-500'}`}>
              Year view coming soon
            </div>
          )}
          {timeFilter === 'W' && (
            <div className={`text-center py-8 ${isDarkMode ? 'text-slate-400' : 'text-stone-500'}`}>
              Week view coming soon
            </div>
          )}
          {timeFilter === 'D' && (
            <div className={`text-center py-8 ${isDarkMode ? 'text-slate-400' : 'text-stone-500'}`}>
              Day view coming soon
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={`flex items-center justify-between px-6 py-4 border-b ${isDarkMode ? 'border-white/10' : 'border-stone-200'}`}>
        <div>
          <h3 className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-stone-500'}`}>
            AUTO JOURNAL
          </h3>
          <p className={`text-[10px] mt-1 ${isDarkMode ? 'text-slate-500' : 'text-stone-400'}`}>
            {brokerConnection.broker_name} • {brokerConnection.account_id}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastSyncTime && (
            <span className={`text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-stone-400'}`}>
              <Clock className="w-3 h-3 inline mr-1" />
              {lastSyncTime.toLocaleTimeString()}
            </span>
          )}
          {isSyncing && (
            <span className={`text-[9px] ${isDarkMode ? 'text-slate-400' : 'text-stone-500'}`}>
              Syncing...
            </span>
          )}
          <button
            onClick={syncTrades}
            disabled={isSyncing}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 ${
              isSyncing 
                ? 'opacity-50 cursor-not-allowed bg-slate-700 text-slate-400' 
                : isDarkMode 
                  ? 'bg-bronze-500/20 hover:bg-bronze-500/30 text-bronze-400 border border-bronze-500/30' 
                  : 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-600 border border-yellow-500/30'
            }`}
            title="Sync Trades Now"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
          <button
            onClick={handleDisconnect}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode 
                ? 'hover:bg-white/5 text-rose-400 hover:text-rose-300' 
                : 'hover:bg-stone-100 text-rose-600 hover:text-rose-700'
            }`}
            title="Disconnect Broker"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Connection Status Indicator */}
      <div className={`px-4 py-2 border-b ${isDarkMode ? 'border-white/10' : 'border-stone-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {error ? (
              <>
                <XCircle className={`w-3 h-3 ${isDarkMode ? 'text-rose-400' : 'text-rose-600'}`} />
                <span className={`text-[10px] ${isDarkMode ? 'text-rose-400' : 'text-rose-600'}`}>
                  Connection Error
                </span>
              </>
            ) : (
              <>
                <CheckCircle className={`w-3 h-3 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                <span className={`text-[10px] ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  Connected
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                if (!brokerConnection || !user) return;
                setIsSyncing(true);
                setError(null);
                
                try {
                  // Go Brain handles all connections - just trigger sync
                  // The Go Brain service on VPS manages MT5 connections automatically
                  toast({
                    title: 'Sync Started',
                    description: 'Go Brain will handle connection management. Trades will sync automatically.',
                    duration: 5000,
                  });
                  
                  console.log('✅ Sync requested - Go Brain will manage connection');
                  
                  // Clear any previous errors
                  setError(null);
                } catch (err: any) {
                  const errorMsg = err.message || 'Could not verify connection';
                  setError(errorMsg);
                  
                  toast({
                    title: 'Connection Test Failed ❌',
                    description: errorMsg,
                    variant: 'destructive',
                    duration: 7000,
                  });
                } finally {
                  setIsSyncing(false);
                }
              }}
              disabled={isSyncing || !brokerConnection}
              className={`px-2 py-1 rounded text-[9px] font-bold transition-all ${
                isSyncing || !brokerConnection
                  ? 'opacity-50 cursor-not-allowed'
                  : isDarkMode
                    ? 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30'
                    : 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-600 border border-blue-500/30'
              }`}
              title="Test Connection"
            >
              Test
            </button>
            {lastSyncTime && (
              <span className={`text-[9px] ${isDarkMode ? 'text-slate-500' : 'text-stone-400'}`}>
                Last sync: {lastSyncTime.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className={`mx-4 mt-4 p-3 rounded-lg flex items-center gap-2 ${
          isDarkMode ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-100 text-rose-600'
        }`}>
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="text-xs">{error}</span>
        </div>
      )}

      {/* View Toggle - Trades / Calendar / Performance */}
      <div className={`px-4 py-2 border-b ${isDarkMode ? 'border-white/10' : 'border-stone-200'}`}>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveView('trades')}
            className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
              activeView === 'trades'
                ? isDarkMode ? 'bg-bronze-500 text-white' : 'bg-yellow-500 text-black'
                : isDarkMode ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Trades
          </button>
          <button
            onClick={() => setActiveView('calendar')}
            className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
              activeView === 'calendar'
                ? isDarkMode ? 'bg-bronze-500 text-white' : 'bg-yellow-500 text-black'
                : isDarkMode ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Calendar
          </button>
          <button
            onClick={() => setActiveView('performance')}
            className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
              activeView === 'performance'
                ? isDarkMode ? 'bg-bronze-500 text-white' : 'bg-yellow-500 text-black'
                : isDarkMode ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Performance
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {activeView === 'trades' && (
          <div className="px-4 py-4 space-y-3">
            {syncedTrades.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center opacity-40">
                <CheckCircle className="w-12 h-12 mb-3" />
                <h4 className="font-bold text-sm uppercase tracking-widest">No Synced Trades</h4>
                <p className="text-[10px] max-w-[150px] leading-relaxed mt-2">
                  Your trades will appear here once synced from your broker.
                </p>
              </div>
            ) : (
              syncedTrades.map((trade) => {
                const durationInfo = trade.open_time && trade.close_time 
                  ? classifyTradeDuration(new Date(trade.open_time), new Date(trade.close_time))
                  : null;
                const badge = durationInfo ? getDurationBadge(durationInfo.category) : null;
                const isProfit = (trade.pnl || 0) >= 0;

                return (
                  <div
                    key={trade.id}
                    className={`relative rounded-xl p-4 transition-all border ${
                      isDarkMode 
                        ? 'bg-slate-950 border-slate-800 hover:border-bronze-500/50' 
                        : 'bg-white border-stone-200 hover:border-yellow-500/50'
                    }`}
                  >
                    {/* Trade Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>
                          {trade.asset_ticker}
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          trade.trade_type === 'LONG' || trade.trade_type === 'Long'
                            ? 'bg-emerald-500/20 text-emerald-400' 
                            : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          {trade.trade_type}
                        </span>
                        {badge && (
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${badge.color}`}>
                            {badge.label}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {isProfit ? (
                          <TrendingUp className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <TrendingDown className="w-3 h-3 text-rose-500" />
                        )}
                        <span className={`text-sm font-bold ${isProfit ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {isProfit ? '+' : ''}${(trade.pnl || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Trade Details */}
                    <div className={`grid grid-cols-3 gap-2 text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-stone-500'}`}>
                      <div>
                        <span className="opacity-60">Entry:</span> ${trade.entry_price?.toFixed(2) || '-'}
                      </div>
                      <div>
                        <span className="opacity-60">Exit:</span> ${trade.exit_price?.toFixed(2) || '-'}
                      </div>
                      <div>
                        <span className="opacity-60">Size:</span> {trade.position_size || '-'}
                      </div>
                    </div>

                    {/* Duration Info */}
                    {durationInfo && (
                      <div className={`mt-2 text-[9px] ${isDarkMode ? 'text-slate-500' : 'text-stone-400'}`}>
                        Duration: {durationInfo.duration}
                      </div>
                    )}

                    {/* Date */}
                    <div className={`mt-2 text-[9px] ${isDarkMode ? 'text-slate-500' : 'text-stone-400'}`}>
                      {new Date(trade.trade_date).toLocaleDateString()}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeView === 'calendar' && (
          <div className="h-full p-4">
            <SimpleCalendar 
              trades={tradesForAnalytics}
              isDarkMode={isDarkMode}
              timeFilter={calendarTimeFilter}
              setTimeFilter={setCalendarTimeFilter}
              viewDate={calendarViewDate}
              setViewDate={setCalendarViewDate}
            />
          </div>
        )}

        {activeView === 'performance' && (
          <div className="h-full p-4">
            <PnLChart data={tradesForAnalytics} isDarkMode={isDarkMode} />
          </div>
        )}
      </div>

      {/* Footer Stats */}
      {syncedTrades.length > 0 && (
        <div className={`px-4 py-3 border-t ${isDarkMode ? 'border-white/10' : 'border-stone-200'}`}>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className={`text-[9px] uppercase tracking-wider ${isDarkMode ? 'text-slate-500' : 'text-stone-400'}`}>
                Total Trades
              </p>
              <p className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>
                {syncedTrades.length}
              </p>
            </div>
            <div>
              <p className={`text-[9px] uppercase tracking-wider ${isDarkMode ? 'text-slate-500' : 'text-stone-400'}`}>
                Win Rate
              </p>
              <p className={`text-sm font-bold text-emerald-500`}>
                {((syncedTrades.filter(t => (t.pnl || 0) > 0).length / syncedTrades.length) * 100).toFixed(0)}%
              </p>
            </div>
            <div>
              <p className={`text-[9px] uppercase tracking-wider ${isDarkMode ? 'text-slate-500' : 'text-stone-400'}`}>
                Total P&L
              </p>
              <p className={`text-sm font-bold ${
                syncedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) >= 0 
                  ? 'text-emerald-500' 
                  : 'text-rose-500'
              }`}>
                ${syncedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
