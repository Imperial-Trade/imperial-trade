
import React, { useCallback, useMemo } from 'react';
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
  const {
    price,
    change,
    changePercent,
    isLoading,
    error,
    lastUpdated,
    connectionStatus,
    refreshPrice
  } = useOptimizedLivePrice(symbol, {
    enableSmartPausing: false, // Keep connection active for trading signals
    debounceMs: 500, // Faster updates for trading
    pauseOnInput: false
  });

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
    switch (connectionStatus) {
      case 'connected':
        return { 
          color: 'text-green-400', 
          icon: Wifi, 
          text: 'Live WebSocket',
          description: 'Real-time price updates via WebSocket'
        };
      case 'connecting':
        return { 
          color: 'text-yellow-400', 
          icon: RefreshCw, 
          text: 'Connecting',
          description: 'Establishing WebSocket connection...'
        };
      case 'error':
      case 'disconnected':
        return { 
          color: 'text-red-400', 
          icon: WifiOff, 
          text: 'Unavailable',
          description: 'WebSocket connection failed'
        };
      default:
        return { 
          color: 'text-gray-400', 
          icon: WifiOff, 
          text: 'Disconnected',
          description: 'Not connected to price feed'
        };
    }
  }, [connectionStatus]);

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
            <connectionStatusInfo.icon className={`w-3 h-3 ${connectionStatus === 'connecting' ? 'animate-spin' : ''}`} />
            <span>{connectionStatusInfo.text}</span>
          </div>
        </div>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => refreshPrice()}
          className="text-gray-400 hover:text-white h-8 w-8 p-0"
          title="Refresh price"
          disabled={isLoading}
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
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

      {/* Price Display */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {isLoading ? (
            <div className="animate-pulse text-gray-400">Loading...</div>
          ) : error ? (
            <div className="text-gray-500 font-mono text-xl">---.--</div>
          ) : (
            <div className="text-accent-green font-mono text-xl font-bold">
              ${formatPrice(price)}
            </div>
          )}
        </div>
        
        {!isLoading && !error && price > 0 && (
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
          >
            Use Current Price
          </Button>
        )}
      </div>

      {/* Data Source Info */}
      <div className="mt-2 pt-2 border-t border-gray-600">
        <div className="text-xs text-gray-500">
          {connectionStatusInfo.description} • Symbol: {symbol}
        </div>
      </div>
    </div>
  );
};

export default EnhancedLivePriceDisplay;
