/**
 * Auto Journal View Component
 * Handles broker connection flow and displays synced trades
 */

import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { BrokerSelection, BrokerType } from './BrokerSelection';
import { BrokerLoginForm } from './BrokerLoginForm';
import { supabase } from '@/integrations/supabase/client';
// SpotlightCard component (same as in JournalPro)
const SpotlightCard: React.FC<{ 
  children: React.ReactNode; 
  className?: string;
  isDarkMode: boolean;
  tilt?: boolean;
}> = ({ children, className = "", isDarkMode, tilt = false }) => {
  const borderColor = isDarkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)";
  return (
    <div className={`relative rounded-3xl transition-transform duration-300 ${className}`}>
      <div className="absolute inset-0 rounded-3xl pointer-events-none z-0" style={{ background: borderColor }} />
      <div className={`relative w-full p-[1px] rounded-3xl z-10`}>
        <div className={`relative w-full bg-[#F5F5F0] dark:bg-[#0A0A0A] rounded-[23px] overflow-hidden flex flex-col p-6`}>
          {children}
        </div>
      </div>
    </div>
  );
};

interface BrokerConnection {
  id: string;
  broker_type: BrokerType;
  is_active: boolean;
  last_sync_at: string | null;
  last_error: string | null;
}

interface AutoJournalViewProps {
  isDarkMode: boolean;
}

export const AutoJournalView: React.FC<AutoJournalViewProps> = ({ isDarkMode }) => {
  const [selectedBroker, setSelectedBroker] = useState<BrokerType | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [connection, setConnection] = useState<BrokerConnection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Check for existing broker connection
  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('broker_connections')
        .select('id, broker_type, is_active, last_sync_at, last_error')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (data && !error) {
        setConnection(data);
        setSelectedBroker(data.broker_type);
      }
    } catch (err) {
      console.error('Error checking connection:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBrokerSelect = (broker: BrokerType) => {
    setSelectedBroker(broker);
    setShowLogin(true);
  };

  const handleLoginSuccess = () => {
    setShowLogin(false);
    checkConnection();
  };

  const handleSyncTrades = async () => {
    if (!connection) return;
    
    setIsSyncing(true);
    try {
      const { error } = await supabase.functions.invoke('sync-broker-trades', {
        body: {
          connection_id: connection.id
        }
      });

      if (error) throw error;

      // Refresh connection status
      await checkConnection();
    } catch (err: any) {
      console.error('Sync error:', err);
      alert(err.message || 'Failed to sync trades');
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-10rem)] min-h-[300px]">
        <Loader2 className={`w-8 h-8 animate-spin ${isDarkMode ? 'text-bronze-500' : 'text-yellow-500'}`} />
      </div>
    );
  }

  // Show broker selection if no connection
  if (!connection && !showLogin) {
    return (
      <SpotlightCard className="h-[calc(100vh-10rem)] min-h-[400px] sm:min-h-[500px]" isDarkMode={isDarkMode} tilt={false}>
        <div className="h-full flex flex-col overflow-y-auto">
          <div className="mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold mb-2 text-foreground">
              Connect Your Broker
            </h2>
            <p className="text-sm sm:text-base text-foreground/70">
              Sync your trades automatically from your MT5 broker account
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            <BrokerSelection
              selectedBroker={selectedBroker}
              onSelect={handleBrokerSelect}
              isDarkMode={isDarkMode}
            />
          </div>
        </div>
      </SpotlightCard>
    );
  }

  // Show login form if broker selected but not connected
  if (showLogin && selectedBroker) {
    return (
      <SpotlightCard className="h-[calc(100vh-10rem)]" isDarkMode={isDarkMode} tilt={false}>
        <BrokerLoginForm
          broker={selectedBroker}
          isDarkMode={isDarkMode}
          onSuccess={handleLoginSuccess}
          onCancel={() => {
            setShowLogin(false);
            setSelectedBroker(null);
          }}
        />
      </SpotlightCard>
    );
  }

  // Show connected state and synced trades
  if (connection) {
    return (
      <div className="flex flex-col gap-4 sm:gap-6 h-[calc(100vh-10rem)] min-h-[400px]">
        {/* Connection Status Card */}
        <SpotlightCard isDarkMode={isDarkMode} tilt={false}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className={`
                w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0
                ${isDarkMode ? 'bg-bronze-500/20' : 'bg-yellow-500/20'}
              `}>
                <CheckCircle className={`w-5 h-5 sm:w-6 sm:h-6 ${isDarkMode ? 'text-bronze-500' : 'text-yellow-500'}`} />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm sm:text-base text-foreground truncate">
                  Connected to {connection.broker_type.replace('_', ' ')}
                </h3>
                <p className="text-xs sm:text-sm text-foreground/70">
                  {connection.last_sync_at
                    ? `Last synced: ${new Date(connection.last_sync_at).toLocaleString()}`
                    : 'Never synced'
                  }
                </p>
              </div>
            </div>
            <button
              onClick={handleSyncTrades}
              disabled={isSyncing}
              className={`
                w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-medium transition-all
                flex items-center justify-center gap-2 text-sm sm:text-base
                ${isDarkMode
                  ? 'bg-bronze-500 hover:bg-bronze-600 active:bg-bronze-700 text-white'
                  : 'bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700 text-black'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {isSyncing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5" />
                  Sync Now
                </>
              )}
            </button>
          </div>
        </SpotlightCard>

        {/* Synced Trades List */}
        <SpotlightCard className="flex-1 min-h-0" isDarkMode={isDarkMode} tilt={false}>
          <div className="h-full flex flex-col min-h-0">
            <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-foreground">Synced Trades</h3>
            <div className="flex-1 overflow-y-auto min-h-0">
              <SyncedTradesList connectionId={connection.id} isDarkMode={isDarkMode} />
            </div>
          </div>
        </SpotlightCard>
      </div>
    );
  }

  return null;
};

// Synced Trades List Component
const SyncedTradesList: React.FC<{ connectionId: string; isDarkMode: boolean }> = ({
  connectionId,
  isDarkMode
}) => {
  const [trades, setTrades] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSyncedTrades();
  }, [connectionId]);

  const loadSyncedTrades = async () => {
    try {
      const { data, error } = await supabase
        .from('trade_journal_entries')
        .select('*')
        .eq('broker_connection_id', connectionId)
        .eq('is_synced', true)
        .order('trade_date', { ascending: false })
        .limit(50);

      if (error) throw error;
      setTrades(data || []);
    } catch (err) {
      console.error('Error loading trades:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className={`w-6 h-6 animate-spin ${isDarkMode ? 'text-bronze-500' : 'text-yellow-500'}`} />
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-foreground/50">
        <p className="text-lg mb-2">No synced trades yet</p>
        <p className="text-sm">Click "Sync Now" to fetch your trades from your broker</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 sm:space-y-3">
      {trades.map((trade) => (
        <div
          key={trade.id}
          className={`
            p-3 sm:p-4 rounded-lg sm:rounded-xl border
            ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}
          `}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
            <span className="font-semibold text-sm sm:text-base text-foreground">{trade.asset_ticker}</span>
            <span className={`font-bold text-sm sm:text-base ${trade.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}
            </span>
          </div>
          <div className="text-xs sm:text-sm text-foreground/70 space-y-1">
            <p className="break-words">Type: {trade.trade_type} | Size: {trade.position_size || 'N/A'}</p>
            <p className="break-words">Entry: {trade.entry_price} → Exit: {trade.exit_price}</p>
            <p>Date: {new Date(trade.trade_date).toLocaleDateString()}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

