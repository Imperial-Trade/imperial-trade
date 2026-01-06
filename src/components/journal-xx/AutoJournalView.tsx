import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, CheckCircle, AlertCircle, Clock, TrendingUp, TrendingDown, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { classifyTradeDuration, TradeDurationCategory } from './utils/tradeDurationClassifier';
import { useToast } from '@/hooks/use-toast';
import { encryptCredentials, hashCredentials } from '@/utils/encryption';

// Broker options
const BROKERS = [
  {
    id: 'xs',
    name: 'XS.com',
    description: 'Global multi-asset broker with competitive spreads',
    servers: ['XS.com-Demo', 'XS.com-Live'],
  },
  {
    id: 'ecmarkets',
    name: 'EC Markets',
    description: 'Premium forex and CFD broker',
    servers: ['ECMarkets-MT5-Demo', 'ECMarkets-MT5-Live01'],
  },
  {
    id: 'puprime',
    name: 'PU Prime',
    description: 'Professional trading platform with advanced tools',
    servers: ['PUPrime-Demo', 'PUPrime-Live'],
  },
];

interface AutoJournalViewProps {
  isDarkMode: boolean;
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

export const AutoJournalView: React.FC<AutoJournalViewProps> = ({ isDarkMode }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [brokerConnection, setBrokerConnection] = useState<BrokerConnection | null>(null);
  const [syncedTrades, setSyncedTrades] = useState<SyncedTrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Broker selection and login form states
  const [selectedBroker, setSelectedBroker] = useState<string | null>(null);
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [server, setServer] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  // Handle broker connection
  const handleConnect = async () => {
    if (!user || !selectedBroker || !loginId || !password || !server) return;
    
    setIsConnecting(true);
    setConnectError(null);
    
    try {
      // Map frontend broker ID to database enum value
      const brokerTypeMap: Record<string, string> = {
        'xs': 'XS',
        'ecmarkets': 'EC_MARKETS',
        'puprime': 'PU_PRIME'
      };
      const dbBrokerType = brokerTypeMap[selectedBroker];
      
      if (!dbBrokerType) {
        throw new Error('Invalid broker type selected');
      }
      
      // Encrypt credentials using AES-256-GCM (production-ready)
      const encryptedLogin = await encryptCredentials(loginId);
      const encryptedPassword = await encryptCredentials(password);
      const encryptedServer = await encryptCredentials(server);
      
      // Hash credentials for change detection (without storing plaintext)
      const credentialsHash = await hashCredentials(loginId, password, server);
      
      // Save the connection directly to database
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
        })
        .select()
        .single();
      
      if (saveError) {
        // Check for unique constraint violation
        if (saveError.code === '23505') {
          throw new Error('You already have a connection for this broker. Please disconnect it first.');
        }
        throw new Error(saveError.message);
      }
      
      toast({
        title: 'Broker Connected',
        description: `Successfully connected to ${BROKERS.find(b => b.id === selectedBroker)?.name}. Note: Live sync requires VPS setup.`,
        duration: 5000,
      });
      
      // Set the broker connection
      setBrokerConnection({
        id: connection.id,
        broker_type: connection.broker_type,
        broker_name: BROKERS.find(b => b.id === selectedBroker)?.name || connection.broker_type,
        account_id: loginId,
        is_active: true,
        last_sync_at: null,
      });
      
      // Clear form
      setLoginId('');
      setPassword('');
      setServer('');
      setSelectedBroker(null);
      
    } catch (err: any) {
      setConnectError(err.message || 'Failed to connect broker');
      toast({
        title: 'Connection Failed',
        description: err.message || 'Failed to connect to broker',
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
        .select('id, broker_type, is_active, last_sync_at')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
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
      }
    } catch (err) {
      console.error('Error fetching broker connection:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Fetch synced trades
  const fetchSyncedTrades = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('trade_journal_entries')
        .select('*')
        .eq('user_id', user.id)
        .not('broker_trade_id', 'is', null) // Only auto-synced trades
        .order('trade_date', { ascending: false })
        .limit(50);
      
      if (error) {
        console.error('Error fetching synced trades:', error);
        return;
      }
      
      if (data) {
        setSyncedTrades(data.map(t => ({
          id: t.id,
          asset_ticker: t.asset_ticker,
          trade_type: t.trade_type,
          pnl: t.pnl,
          entry_price: t.entry_price,
          exit_price: t.exit_price,
          position_size: t.position_size,
          trade_date: t.trade_date,
          open_time: t.open_time,
          close_time: t.close_time,
        })));
      }
    } catch (err) {
      console.error('Error fetching synced trades:', err);
    }
  }, [user]);

  // Sync trades from broker
  const syncTrades = useCallback(async () => {
    if (!brokerConnection) {
      setError('No broker connection');
      return;
    }

    setIsSyncing(true);
    setError(null);

    try {
      const { data, error: syncError } = await supabase.functions.invoke('sync-broker-trades', {
        body: {
          connection_id: brokerConnection.id
        }
      });

      if (syncError) {
        throw syncError;
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Sync failed');
      }

      const tradesCount = data.trades_synced || 0;
      setLastSyncTime(new Date());

      toast({
        title: 'Sync Complete',
        description: `Successfully synced ${tradesCount} trade${tradesCount !== 1 ? 's' : ''} from your broker`,
        duration: 3000,
      });

      // Refresh trades list
      await fetchSyncedTrades();
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to sync trades';
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

  // Auto-sync every 5 minutes if connected
  useEffect(() => {
    if (!brokerConnection) return;
    
    const interval = setInterval(() => {
      syncTrades();
    }, 5 * 60 * 1000); // 5 minutes
    
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
              onClick={() => setSelectedBroker(broker.id)}
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
                  Server
                </label>
                <input
                  type="text"
                  value={server}
                  onChange={(e) => setServer(e.target.value)}
                  placeholder={BROKERS.find(b => b.id === selectedBroker)?.servers[0] || 'Server name'}
                  className={`w-full px-3 py-2.5 rounded-xl text-sm border ${
                    isDarkMode 
                      ? 'bg-slate-900 border-slate-800 text-white placeholder:text-slate-600' 
                      : 'bg-stone-50 border-stone-200 text-stone-900 placeholder:text-stone-400'
                  }`}
                />
              </div>
            </div>
            
            {connectError && (
              <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
                isDarkMode ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-100 text-rose-600'
              }`}>
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="text-xs">{connectError}</span>
              </div>
            )}
            
            <button
              onClick={handleConnect}
              disabled={isConnecting || !loginId || !password || !server}
              className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                isConnecting || !loginId || !password || !server
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
          <button
            onClick={syncTrades}
            disabled={isSyncing}
            className={`p-2 rounded-lg transition-colors ${
              isSyncing 
                ? 'opacity-50 cursor-not-allowed' 
                : isDarkMode 
                  ? 'hover:bg-white/5' 
                  : 'hover:bg-stone-100'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''} ${isDarkMode ? 'text-bronze-500' : 'text-yellow-600'}`} />
          </button>
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

      {/* Trades List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
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
