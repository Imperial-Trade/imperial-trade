import { useEffect, useState, useCallback } from 'react';
import { traderMadeBusinessService } from '@/services/TraderMadeBusinessService';
import { useWebSocketPrices } from '@/contexts/WebSocketPriceContext';

interface BusinessPlanMetrics {
  availableSymbols: number;
  activeSymbols: number;
  rateLimit: number;
  updateFrequency: number;
  cacheStrategy: string;
  connectionHealth: 'excellent' | 'good' | 'degraded';
  planOptimizations: string[];
}

export function useBusinessPlanOptimization() {
  const [metrics, setMetrics] = useState<BusinessPlanMetrics>();
  const [isOptimized, setIsOptimized] = useState(false);
  const { connectionStatus, prices } = useWebSocketPrices();

  const initializeBusinessPlan = useCallback(() => {
    const config = traderMadeBusinessService.getConfiguration();
    
    setMetrics({
      availableSymbols: traderMadeBusinessService.getAllSymbols().length,
      activeSymbols: Object.keys(prices).length,
      rateLimit: config.features.rateLimit,
      updateFrequency: config.performance.updateFrequency,
      cacheStrategy: 'multi-tier-business',
      connectionHealth: connectionStatus === 'connected' ? 'excellent' : 'degraded',
      planOptimizations: [
        '50+ symbols supported',
        '1000 req/min rate limit',
        '0.5s priority cache TTL',
        'Ultra-fast WebSocket updates',
        'Advanced market features'
      ]
    });
    
    setIsOptimized(true);
    console.log('🚀 TraderMade Business Plan optimizations activated');
  }, [connectionStatus, prices]);

  useEffect(() => {
    initializeBusinessPlan();
  }, [initializeBusinessPlan]);

  const getSymbolCacheTTL = useCallback((symbol: string, isPriorityAlert: boolean = false): number => {
    return traderMadeBusinessService.getCacheTTL(symbol, isPriorityAlert);
  }, []);

  const validateSymbol = useCallback((symbol: string): boolean => {
    return traderMadeBusinessService.validateBusinessPlanSymbol(symbol);
  }, []);

  const getOptimalBatchSize = useCallback((symbolCount: number): number => {
    return traderMadeBusinessService.getOptimalBatchSize(symbolCount);
  }, []);

  return {
    metrics,
    isOptimized,
    getSymbolCacheTTL,
    validateSymbol,
    getOptimalBatchSize,
    businessPlanActive: true
  };
}