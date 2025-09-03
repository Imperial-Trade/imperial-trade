import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { WebSocketPriceProvider, useWebSocketPrices } from './WebSocketPriceContext';
import { EnhancedWebSocketPriceProvider, useEnhancedWebSocketPrices } from './EnhancedWebSocketPriceContext';

interface PriceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
  bid?: number;
  ask?: number;
  mid?: number;
}

interface HybridWebSocketContextType {
  prices: Record<string, PriceData>;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  dataSource: string;
  lastUpdated: Date | null;
  errors: Record<string, string>;
  subscribe: (symbols: string[]) => void;
  unsubscribe: (symbols: string[]) => void;
  getPrice: (symbol: string) => PriceData | null;
  refreshPrice: (symbol: string) => void;
  getConnectionHealth: () => { isHealthy: boolean; lastUpdate: Date | null };
  getStats?: () => { 
    messagesReceived: number; 
    reconnections: number; 
    avgLatency: number;
  };
  isUsingEnhancedSystem: boolean;
}

const HybridWebSocketContext = createContext<HybridWebSocketContextType | null>(null);

export const useHybridWebSocketPrices = (): HybridWebSocketContextType => {
  const context = useContext(HybridWebSocketContext);
  if (!context) {
    throw new Error('useHybridWebSocketPrices must be used within HybridWebSocketPriceProvider');
  }
  return context;
};

interface HybridWebSocketPriceProviderProps {
  children: ReactNode;
  enhancedRolloutPercentage?: number; // Percentage of users to use enhanced system (0-100)
}

// Determine if user should use enhanced system
const shouldUseEnhancedSystem = (rolloutPercentage: number): boolean => {
  const userId = localStorage.getItem('supabase.auth.token')?.slice(-8) || 'anonymous';
  const hash = userId.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  const userPercentile = Math.abs(hash) % 100;
  return userPercentile < rolloutPercentage;
};

const EnhancedHybridContextProvider: React.FC<{ 
  children: ReactNode; 
  onSystemSwitch: (enhanced: boolean) => void;
}> = ({ children, onSystemSwitch }) => {
  const enhancedContext = useEnhancedWebSocketPrices();

  const contextValue: HybridWebSocketContextType = {
    prices: enhancedContext.prices,
    connectionStatus: enhancedContext.connectionStatus,
    dataSource: `Enhanced (${enhancedContext.dataSource})`,
    lastUpdated: enhancedContext.lastUpdated,
    errors: enhancedContext.errors,
    subscribe: enhancedContext.subscribe,
    unsubscribe: enhancedContext.unsubscribe,
    getPrice: enhancedContext.getPrice,
    refreshPrice: enhancedContext.refreshPrice,
    getConnectionHealth: () => {
      const health = enhancedContext.getConnectionHealth();
      return { isHealthy: health.isHealthy, lastUpdate: health.lastUpdate };
    },
    getStats: enhancedContext.getStats,
    isUsingEnhancedSystem: true
  };

  useEffect(() => {
    if (enhancedContext.connectionStatus === 'error') {
      console.warn('🔄 Enhanced system error detected, switching to legacy');
      onSystemSwitch(false);
    }
  }, [enhancedContext.connectionStatus, onSystemSwitch]);

  return (
    <HybridWebSocketContext.Provider value={contextValue}>
      {children}
    </HybridWebSocketContext.Provider>
  );
};

const LegacyHybridContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const legacyContext = useWebSocketPrices();

  const contextValue: HybridWebSocketContextType = {
    prices: legacyContext.prices,
    connectionStatus: legacyContext.connectionStatus,
    dataSource: 'Legacy (WebSocket)',
    lastUpdated: legacyContext.lastUpdated,
    errors: legacyContext.errors,
    subscribe: legacyContext.subscribe,
    unsubscribe: legacyContext.unsubscribe,
    getPrice: legacyContext.getPrice,
    refreshPrice: legacyContext.refreshPrice,
    getConnectionHealth: () => {
      const health = legacyContext.getConnectionHealth();
      return { isHealthy: health.isHealthy, lastUpdate: health.lastUpdate };
    },
    getStats: undefined,
    isUsingEnhancedSystem: false
  };

  return (
    <HybridWebSocketContext.Provider value={contextValue}>
      {children}
    </HybridWebSocketContext.Provider>
  );
};

export const HybridWebSocketPriceProvider: React.FC<HybridWebSocketPriceProviderProps> = ({ 
  children, 
  enhancedRolloutPercentage = 10 // Default 10% rollout
}) => {
  const [useEnhanced, setUseEnhanced] = useState(() => 
    shouldUseEnhancedSystem(enhancedRolloutPercentage)
  );

  useEffect(() => {
    const system = useEnhanced ? 'Enhanced' : 'Legacy';
    console.log(`🎯 WebSocket System: ${system} (${enhancedRolloutPercentage}% rollout)`);
  }, [useEnhanced, enhancedRolloutPercentage]);

  const handleSystemSwitch = (enhanced: boolean) => {
    setUseEnhanced(enhanced);
  };

  if (useEnhanced) {
    return (
      <EnhancedWebSocketPriceProvider>
        <WebSocketPriceProvider>
          <EnhancedHybridContextProvider onSystemSwitch={handleSystemSwitch}>
            {children}
          </EnhancedHybridContextProvider>
        </WebSocketPriceProvider>
      </EnhancedWebSocketPriceProvider>
    );
  }

  // Legacy system (fallback or default)
  return (
    <WebSocketPriceProvider>
      <LegacyHybridContextProvider>
        {children}
      </LegacyHybridContextProvider>
    </WebSocketPriceProvider>
  );
};

export default HybridWebSocketPriceProvider;