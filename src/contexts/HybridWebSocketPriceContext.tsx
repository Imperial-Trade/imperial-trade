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

const EnhancedSystemWrapper: React.FC<{ children: ReactNode; onFallback: () => void }> = ({ 
  children, 
  onFallback 
}) => {
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    const handleError = () => {
      console.warn('🔄 Enhanced WebSocket failed, falling back to legacy system');
      setHasFailed(true);
      onFallback();
    };

    // Listen for enhanced system failures
    window.addEventListener('enhanced-websocket-error', handleError);
    return () => window.removeEventListener('enhanced-websocket-error', handleError);
  }, [onFallback]);

  if (hasFailed) {
    return null; // Will trigger fallback in parent
  }

  return <>{children}</>;
};

const HybridContextProvider: React.FC<{ 
  children: ReactNode; 
  useEnhanced: boolean;
  onSystemSwitch: (enhanced: boolean) => void;
}> = ({ children, useEnhanced, onSystemSwitch }) => {
  const legacyContext = useWebSocketPrices();
  const enhancedContext = useEnhancedWebSocketPrices();

  const activeContext = useEnhanced ? enhancedContext : legacyContext;

  const contextValue: HybridWebSocketContextType = {
    prices: activeContext.prices,
    connectionStatus: activeContext.connectionStatus,
    dataSource: useEnhanced ? `Enhanced (${enhancedContext.dataSource})` : `Legacy (WebSocket)`,
    lastUpdated: activeContext.lastUpdated,
    errors: activeContext.errors,
    subscribe: activeContext.subscribe,
    unsubscribe: activeContext.unsubscribe,
    getPrice: activeContext.getPrice,
    refreshPrice: activeContext.refreshPrice,
    getConnectionHealth: () => {
      const health = activeContext.getConnectionHealth();
      return {
        isHealthy: health.isHealthy,
        lastUpdate: health.lastUpdate || (health as any).lastHeartbeat || activeContext.lastUpdated
      };
    },
    getStats: useEnhanced ? enhancedContext.getStats : undefined,
    isUsingEnhancedSystem: useEnhanced
  };

  // Monitor system health and switch if needed
  useEffect(() => {
    if (useEnhanced && enhancedContext.connectionStatus === 'error') {
      console.warn('🔄 Enhanced system error detected, switching to legacy');
      onSystemSwitch(false);
    }
  }, [useEnhanced, enhancedContext.connectionStatus, onSystemSwitch]);

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
  const [hasEnhancedFailed, setHasEnhancedFailed] = useState(false);

  useEffect(() => {
    const system = useEnhanced ? 'Enhanced' : 'Legacy';
    console.log(`🎯 WebSocket System: ${system} (${enhancedRolloutPercentage}% rollout)`);
  }, [useEnhanced, enhancedRolloutPercentage]);

  const handleFallback = () => {
    setHasEnhancedFailed(true);
    setUseEnhanced(false);
  };

  const handleSystemSwitch = (enhanced: boolean) => {
    if (!enhanced || !hasEnhancedFailed) {
      setUseEnhanced(enhanced);
    }
  };

  if (useEnhanced && !hasEnhancedFailed) {
    return (
      <EnhancedWebSocketPriceProvider>
        <EnhancedSystemWrapper onFallback={handleFallback}>
          <WebSocketPriceProvider>
            <HybridContextProvider 
              useEnhanced={true}
              onSystemSwitch={handleSystemSwitch}
            >
              {children}
            </HybridContextProvider>
          </WebSocketPriceProvider>
        </EnhancedSystemWrapper>
      </EnhancedWebSocketPriceProvider>
    );
  }

  // Legacy system (fallback or default)
  return (
    <WebSocketPriceProvider>
      <HybridContextProvider 
        useEnhanced={false}
        onSystemSwitch={handleSystemSwitch}
      >
        {children}
      </HybridContextProvider>
    </WebSocketPriceProvider>
  );
};

export default HybridWebSocketPriceProvider;