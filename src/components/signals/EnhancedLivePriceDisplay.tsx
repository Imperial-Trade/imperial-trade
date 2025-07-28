
import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useOptimizedLivePrice } from '@/hooks/useOptimizedLivePrice';
import { TrendingUp, TrendingDown, RefreshCw, Clock, AlertTriangle, Wifi, WifiOff } from 'lucide-react';

interface EnhancedLivePriceDisplayProps {
  symbol: string;
  assetName: string;
  onUseCurrentPrice?: (price: number) => void;
  className?: string;
}

const EnhancedLivePriceDisplay: React.FC<EnhancedLivePriceDisplayProps> = ({
  symbol,
  assetName,
  onUseCurrentPrice,
  className = ''
}) => {
  // Map frontend symbols to standardized API symbols
  const mapSymbolForAPI = (frontendSymbol: string): string => {
    const symbolMap: Record<string, string> = {
      'GOLD': 'XAU/USD',
      'XAU/USD': 'XAU/USD',
      'BTC/USD': 'BTC/USD'
    };
    return symbolMap[frontendSymbol] || frontendSymbol;
  };

  const apiSymbol = mapSymbolForAPI(symbol);
  
  const {
    price,
    change,
    changePercent,
    isLoading,
    error,
    lastUpdated,
    connectionStatus,
    refreshPrice
  } = useOptimizedLivePrice(apiSymbol, {
    enableSmartPausing: false, // Keep connection active for trading signals
    debounceMs: 500, // Faster updates for trading
    pauseOnInput: false
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dataAge, setDataAge] = useState<string>('');

  // Update data age every second
  useEffect(() => {
    const updateAge = () => {
      if (!lastUpdated) {
        setDataAge('');
        return;
      }
      
      const now = new Date();
      const diffMs = now.getTime() - lastUpdated.getTime();
      const diffSeconds = Math.floor(diffMs / 1000);
      
      if (diffSeconds < 30) {
        setDataAge('Live');
      } else if (diffSeconds < 60) {
        setDataAge(`${diffSeconds}s ago`);
      } else if (diffSeconds < 3600) {
        const minutes = Math.floor(diffSeconds / 60);
        setDataAge(`${minutes}m ago`);
      } else {
        setDataAge('Stale');
      }
    };

    updateAge();
    const interval = setInterval(updateAge, 1000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  const formatPrice = useCallback((price: number) => {
    // Dynamic decimal places based on price magnitude
    if (price >= 1000) {
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(price);
    } else if (price >= 1) {
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
      }).format(price);
    } else {
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 4,
        maximumFractionDigits: 6,
      }).format(price);
    }
  }, []);

  const formatTime = useCallback((date: Date | null) => {
    if (!date) return '';
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }, []);

  const connectionStatusInfo = useMemo(() => {
    const dataFreshness = lastUpdated ? (new Date().getTime() - lastUpdated.getTime()) / 1000 : Infinity;
    
    if (isLoading || connectionStatus === 'connecting') {
      return { 
        color: 'text-yellow-400', 
        icon: RefreshCw, 
        text: 'Fetching',
        description: 'Fetching latest price data...',
        animate: true
      };
    }
    
    if (error) {
      return { 
        color: 'text-red-400', 
        icon: AlertTriangle, 
        text: 'Error',
        description: 'Failed to fetch price data',
        animate: false
      };
    }
    
    if (connectionStatus === 'connected' && dataFreshness < 30) {
      return { 
        color: 'text-green-400', 
        icon: Wifi, 
        text: 'Live',
        description: 'Real-time price updates active',
        animate: false
      };
    }
    
    if (connectionStatus === 'connected' && dataFreshness < 60) {
      return { 
        color: 'text-yellow-400', 
        icon: Wifi, 
        text: 'Delayed',
        description: 'Price data is slightly delayed',
        animate: false
      };
    }
    
    if (connectionStatus === 'disconnected' || dataFreshness >= 60) {
      return { 
        color: 'text-red-400', 
        icon: WifiOff, 
        text: 'Offline',
        description: 'No recent price updates',
        animate: false
      };
    }
    
    return { 
      color: 'text-gray-400', 
      icon: WifiOff, 
      text: 'Unknown',
      description: 'Connection status unknown',
      animate: false
    };
  }, [connectionStatus, isLoading, error, lastUpdated]);

  // Handle refresh with loading state
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshPrice();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500); // Show loading for at least 500ms
    }
  };

  const priceChangeColor = useMemo(() => {
    return change >= 0 ? 'text-green-400' : 'text-red-400';
  }, [change]);

  const priceChangeIcon = useMemo(() => {
    return change >= 0 ? TrendingUp : TrendingDown;
  }, [change]);

  if (!symbol) return null;

  return (
    <div className={`bg-gray-800/50 border border-gray-600 rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="text-white font-medium">
            Live Price for {assetName}
          </div>
          <div className={`flex items-center gap-1 text-xs ${connectionStatusInfo.color}`}>
            <connectionStatusInfo.icon 
              className={`w-3 h-3 ${connectionStatusInfo.animate ? 'animate-spin' : ''}`} 
            />
            <span>{connectionStatusInfo.text}</span>
            {dataAge && (
              <>
                <span className="text-gray-500">•</span>
                <span className={`${
                  dataAge === 'Live' ? 'text-green-400' : 
                  dataAge === 'Stale' ? 'text-red-400' : 
                  'text-yellow-400'
                }`}>
                  {dataAge}
                </span>
              </>
            )}
          </div>
        </div>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          className="text-gray-400 hover:text-white h-8 w-8 p-0"
          title="Refresh price"
          disabled={isLoading || isRefreshing}
        >
          <RefreshCw className={`w-4 h-4 ${
            isLoading || isRefreshing ? 'animate-spin' : ''
          }`} />
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-2 mb-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <div className="text-red-400 text-sm">
            {error}
          </div>
        </div>
      )}

      {/* Loading State for Initial Load */}
      {isLoading && price === 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-7 w-32 bg-gray-600 rounded animate-pulse"></div>
              <div className="h-4 w-4 bg-gray-600 rounded animate-pulse"></div>
            </div>
            <div className="h-6 w-20 bg-gray-600 rounded animate-pulse"></div>
          </div>
          <div className="flex items-center justify-between">
            <div className="h-4 w-24 bg-gray-600 rounded animate-pulse"></div>
            <div className="h-6 w-24 bg-gray-600 rounded animate-pulse"></div>
          </div>
        </div>
      )}

      {/* Price Display */}
      {(price > 0 || !isLoading) && (
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {error ? (
              <div className="text-gray-500 font-mono text-xl">---.--</div>
            ) : (
              <div className={`text-accent-green font-mono text-xl font-bold ${
                isLoading || isRefreshing ? 'animate-pulse' : ''
              }`}>
                ${formatPrice(price)}
              </div>
            )}
            
            {(isLoading || isRefreshing) && price > 0 && (
              <div className="flex items-center gap-1 text-yellow-400 text-xs">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Updating...</span>
              </div>
            )}
          </div>
          
          {!error && price > 0 && (
            <div className={`flex items-center gap-1 ${priceChangeColor}`}>
              {React.createElement(priceChangeIcon, { className: "w-4 h-4" })}
              <div className="text-right">
                <div className="text-sm font-medium">
                  {change >= 0 ? '+' : ''}{change.toFixed(4)}
                </div>
                <div className="text-xs">
                  ({change >= 0 ? '+' : ''}{changePercent.toFixed(2)}%)
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Clock className="w-3 h-3" />
          <span>
            {lastUpdated ? `Updated: ${formatTime(lastUpdated)}` : 'No recent updates'}
          </span>
        </div>
        
        {onUseCurrentPrice && !isLoading && !error && price > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onUseCurrentPrice(price)}
            className="border-accent-green/30 text-accent-green hover:bg-accent-green/20 h-7 px-3 text-xs"
            disabled={isRefreshing}
          >
            Use Current Price
          </Button>
        )}
      </div>

      {/* Data Source Info */}
      <div className="mt-2 pt-2 border-t border-gray-600">
        <div className="text-xs text-gray-500">
          {connectionStatusInfo.description} • Symbol: {symbol} • Source: Twelve Data API
        </div>
      </div>
    </div>
  );
};

export default EnhancedLivePriceDisplay;
