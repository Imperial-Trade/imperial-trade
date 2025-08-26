
import { useEffect, useCallback } from 'react';
import { useWebSocketPrices } from '@/contexts/WebSocketPriceContext';
import { TradeAlertWithProfile } from '@/api/services/TradingApiService';

interface UseRealTimeSignalUpdatesProps {
  alerts: TradeAlertWithProfile[];
  onSignalUpdate?: (alert: TradeAlertWithProfile, priceUpdate: {
    currentPrice: number;
    pipsProgress: number;
    distanceToEntry?: number;
  }) => void;
}

export const useRealTimeSignalUpdates = ({
  alerts,
  onSignalUpdate
}: UseRealTimeSignalUpdatesProps) => {
  const { prices, connectionStatus } = useWebSocketPrices();

  // Calculate pips progress for a signal
  const calculatePipsProgress = useCallback((alert: TradeAlertWithProfile, currentPrice: number) => {
    if (!currentPrice || currentPrice === 0) return 0;

    const isBuyTrade = alert.tradeType.startsWith('buy');
    const priceDiff = currentPrice - alert.entryPrice;
    
    // For pending signals, calculate distance to entry
    if (alert.status === 'pending') {
      return Math.abs(priceDiff);
    }

    // For active signals, calculate pips in progress
    // Adjust for trade direction (buy = positive when price goes up, sell = positive when price goes down)
    return isBuyTrade ? priceDiff : -priceDiff;
  }, []);

  // Subscribe to price updates for all symbols in alerts
  const symbols = alerts.map(alert => alert.tradermadeSymbol || alert.assetName);
  
  useEffect(() => {
    if (symbols.length === 0) return;

    // Process price updates for each alert
    alerts.forEach(alert => {
      const symbol = alert.tradermadeSymbol || alert.assetName;
      const priceData = prices[symbol];
      
      if (priceData && onSignalUpdate) {
        const pipsProgress = calculatePipsProgress(alert, priceData.price);
        const distanceToEntry = alert.status === 'pending' 
          ? Math.abs(priceData.price - alert.entryPrice)
          : undefined;

        onSignalUpdate(alert, {
          currentPrice: priceData.price,
          pipsProgress,
          distanceToEntry
        });
      }
    });
  }, [alerts, prices, calculatePipsProgress, onSignalUpdate]);

  return {
    connectionStatus,
    hasLivePrices: Object.keys(prices).length > 0
  };
};
