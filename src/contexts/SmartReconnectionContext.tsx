// PHASE 3: Smart Reconnection Management
// Intelligent reconnection logic with exponential backoff and market awareness

import React, { createContext, useContext, useCallback, useRef } from 'react';
import { getUnifiedMarketStatus } from '@/utils/unifiedMarketHours';
import { smartPriceOptimizer } from '@/services/SmartPriceOptimizer';

interface ReconnectionState {
  attempts: number;
  lastAttempt: Date | null;
  nextAttempt: Date | null;
  strategy: 'immediate' | 'smart_backoff' | 'market_aware' | 'emergency';
}

interface SmartReconnectionContextType {
  scheduleReconnection: (reason: string, symbols: string[]) => void;
  cancelReconnection: () => void;
  getReconnectionStatus: () => ReconnectionState;
  isReconnecting: boolean;
}

const SmartReconnectionContext = createContext<SmartReconnectionContextType | null>(null);

export const useSmartReconnection = (): SmartReconnectionContextType => {
  const context = useContext(SmartReconnectionContext);
  if (!context) {
    throw new Error('useSmartReconnection must be used within SmartReconnectionProvider');
  }
  return context;
};

interface SmartReconnectionProviderProps {
  children: React.ReactNode;
  onReconnect: () => Promise<void>;
}

export const SmartReconnectionProvider: React.FC<SmartReconnectionProviderProps> = ({
  children,
  onReconnect
}) => {
  const reconnectionState = useRef<ReconnectionState>({
    attempts: 0,
    lastAttempt: null,
    nextAttempt: null,
    strategy: 'immediate'
  });
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isReconnectingRef = useRef<boolean>(false);

  // Smart reconnection scheduling based on multiple factors
  const scheduleReconnection = useCallback((reason: string, symbols: string[]) => {
    if (isReconnectingRef.current) {
      console.log('🔄 Reconnection already in progress, skipping...');
      return;
    }

    // Cancel any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const state = reconnectionState.current;
    state.attempts++;
    state.lastAttempt = new Date();

    // Determine reconnection strategy
    const strategy = getReconnectionStrategy(reason, symbols, state.attempts);
    state.strategy = strategy;

    const delay = calculateSmartDelay(strategy, state.attempts, symbols);
    state.nextAttempt = new Date(Date.now() + delay);

    console.log(`🧠 SMART RECONNECTION: Strategy \"${strategy}\" - Attempt ${state.attempts} in ${Math.round(delay/1000)}s`);
    console.log(`📋 Reason: ${reason}`);

    timeoutRef.current = setTimeout(async () => {
      isReconnectingRef.current = true;
      
      try {
        console.log(`🚀 SMART RECONNECTION: Executing attempt ${state.attempts} (${strategy})`);
        await onReconnect();
        
        // Reset state on successful reconnection
        state.attempts = 0;
        state.strategy = 'immediate';
        state.nextAttempt = null;
        
        console.log('✅ SMART RECONNECTION: Successfully reconnected');
      } catch (error) {
        console.error('❌ SMART RECONNECTION: Failed:', error);
        
        // Schedule next attempt if not too many failures
        if (state.attempts < 10) {
          scheduleReconnection(`Retry after failure: ${error}`, symbols);
        } else {
          console.error('🚨 SMART RECONNECTION: Max attempts reached, giving up');
        }
      } finally {
        isReconnectingRef.current = false;
      }
    }, delay);
  }, [onReconnect]);

  const cancelReconnection = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    reconnectionState.current.nextAttempt = null;
    isReconnectingRef.current = false;
    
    console.log('❌ SMART RECONNECTION: Cancelled');
  }, []);

  const getReconnectionStatus = useCallback((): ReconnectionState => {
    return { ...reconnectionState.current };
  }, []);

  const value: SmartReconnectionContextType = {
    scheduleReconnection,
    cancelReconnection,
    getReconnectionStatus,
    isReconnecting: isReconnectingRef.current
  };

  return (
    <SmartReconnectionContext.Provider value={value}>
      {children}
    </SmartReconnectionContext.Provider>
  );
};

// Determine the best reconnection strategy based on context
function getReconnectionStrategy(
  reason: string, 
  symbols: string[], 
  attempts: number
): 'immediate' | 'smart_backoff' | 'market_aware' | 'emergency' {
  // Emergency strategy for critical failures
  if (attempts > 7) {
    return 'emergency';
  }

  // Market-aware strategy for market closure related disconnections
  if (reason.includes('market') || reason.includes('closed')) {
    return 'market_aware';
  }

  // Immediate strategy for first few attempts with good connection health
  if (attempts <= 2) {
    const optimizationReport = smartPriceOptimizer.getOptimizationReport();
    if (optimizationReport.connectionHealth.status === 'excellent') {
      return 'immediate';
    }
  }

  // Default to smart backoff
  return 'smart_backoff';
}

// Calculate delay based on strategy and context
function calculateSmartDelay(
  strategy: 'immediate' | 'smart_backoff' | 'market_aware' | 'emergency',
  attempts: number,
  symbols: string[]
): number {
  switch (strategy) {
    case 'immediate':
      return 500; // 500ms for immediate reconnection

    case 'smart_backoff':
      // Exponential backoff with jitter: 1s, 2s, 4s, 8s, etc.
      const baseDelay = Math.min(Math.pow(2, attempts - 1) * 1000, 30000); // Cap at 30s
      const jitter = Math.random() * 1000; // Add up to 1s jitter
      return baseDelay + jitter;

    case 'market_aware':
      // Check when markets will be open for the requested symbols
      const nextOpenTimes = symbols
        .map(symbol => getUnifiedMarketStatus(symbol))
        .filter(status => status.nextOpenTime)
        .map(status => status.nextOpenTime!.getTime());
      
      if (nextOpenTimes.length > 0) {
        const earliestOpen = Math.min(...nextOpenTimes);
        const timeUntilOpen = earliestOpen - Date.now();
        
        // If market opens soon (< 5 minutes), wait until then
        if (timeUntilOpen > 0 && timeUntilOpen < 5 * 60 * 1000) {
          return timeUntilOpen + 1000; // Wait until open + 1s
        }
      }
      
      // Otherwise use smart backoff
      return calculateSmartDelay('smart_backoff', attempts, symbols);

    case 'emergency':
      // Very long delay for emergency situations
      return 60000 + Math.random() * 30000; // 60-90 seconds

    default:
      return 5000; // 5s fallback
  }
}
