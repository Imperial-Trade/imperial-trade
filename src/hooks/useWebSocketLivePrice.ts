
import { useOptimizedLivePrice } from './useOptimizedLivePrice';

interface LivePriceData {
  price: number;
  change: number;
  changePercent: number;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
}

export function useWebSocketLivePrice(symbol: string): LivePriceData {
  const optimizedData = useOptimizedLivePrice(symbol, {
    enableSmartPausing: true,
    debounceMs: 500,
    pauseOnInput: true
  });

  return {
    price: optimizedData.price,
    change: optimizedData.change,
    changePercent: optimizedData.changePercent,
    isLoading: optimizedData.isLoading,
    error: optimizedData.error,
    lastUpdated: optimizedData.lastUpdated,
    connectionStatus: optimizedData.connectionStatus
  };
}
