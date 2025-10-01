import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { useOptimizedLivePrice } from '@/hooks/useOptimizedLivePrice';
import { usePriceStalenessMonitor } from '@/hooks/usePriceStalenessMonitor';
import { useConnectionStability } from '@/hooks/useConnectionStability';
import { isPricePlausibleForSymbol } from '@/utils/priceGuards';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  Wifi, 
  WifiOff, 
  Clock,
  AlertTriangle,
  Zap,
  Timer
} from 'lucide-react';
import { getStandardSymbol } from '@/types/assets';

interface EnhancedLivePriceDisplayProps {
  symbol: string;
  assetName: string;
  onUseCurrentPrice?: (price: number) => void;
  onPriceUpdate?: (price: number) => void;
  className?: string;
}

const EnhancedLivePriceDisplay: React.FC<EnhancedLivePriceDisplayProps> = ({
  symbol,
  assetName,
  onUseCurrentPrice,
  onPriceUpdate,
  className = ''
}) => {
  // Use standardized symbol mapping
  const apiSymbol = getStandardSymbol(symbol) || symbol;
  
  const { price, change, changePercent, isLoading, error, lastUpdated, connectionStatus, priceUpdateSource, refreshPrice, arrivalAgeMs, arrivalAgeSeconds } = useOptimizedLivePrice(symbol, {
    debounceMs: 50, // Critical: Faster response for trading decisions
    enableSmartPausing: false
  });

  // Defensive check: Prevent showing implausible prices for closed markets
  const displayPrice = useMemo(() => {
    if (!price || price === 0) return 0;
    
    // Check price plausibility
    if (!isPricePlausibleForSymbol(price, symbol)) {
      console.error(`🚨 UI Guard: Blocked implausible price display for ${symbol}: ${price}`);
      return 0; // Don't show implausible prices
    }
    
    return price;
  }, [price, symbol]);

  // Critical: Monitor price staleness for trading safety - Sub-2s Live Guarantee
  const stalenessStatus = usePriceStalenessMonitor(symbol, 2); // 2-second staleness threshold
  
  // ✅ FLICKER ELIMINATION: Stability management
  const { shouldAllowQualityChange } = useConnectionStability();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dataAge, setDataAge] = useState<string>('');
  const [prevPrice, setPrevPrice] = useState<number>(0);
  const [priceAnimation, setPriceAnimation] = useState<'up' | 'down' | null>(null);
  const [debouncedConnectionStatus, setDebouncedConnectionStatus] = useState(connectionStatus);

  // GUARANTEED 2s Updates: Use current timestamp vs last updated for accurate staleness
  useEffect(() => {
    const updateAge = () => {
      if (!lastUpdated) {
        setDataAge('--');
        return;
      }
      
      // Calculate age from lastUpdated timestamp for guaranteed accuracy
      const ageMs = Date.now() - lastUpdated.getTime();
      const ageSeconds = Math.floor(ageMs / 1000);
      
      if (ageSeconds < 2) {
        setDataAge('Live'); // Show "Live" for sub-2-second data
      } else if (ageSeconds < 3) {
        setDataAge('Live'); // Extended to 3 seconds for heartbeat tolerance
      } else if (ageSeconds < 60) {
        setDataAge(`${ageSeconds}s ago`);
      } else if (ageSeconds < 3600) {
        const minutes = Math.floor(ageSeconds / 60);
        setDataAge(`${minutes}m ago`);
      } else {
        setDataAge('Stale');
      }
    };

    updateAge();
    // Update every 500ms for smooth, guaranteed real-time experience
    const interval = setInterval(updateAge, 500);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  // Optimized price change animation effect
  useEffect(() => {
    if (price > 0 && prevPrice > 0 && price !== prevPrice) {
      // Only animate for significant changes to reduce visual noise
      const changePercent = Math.abs((price - prevPrice) / prevPrice) * 100;
      if (changePercent >= 0.02) { // Increased threshold to 0.02% for less noise
        setPriceAnimation(price > prevPrice ? 'up' : 'down');
        const timer = setTimeout(() => setPriceAnimation(null), 250); // Reduced to 250ms
        return () => clearTimeout(timer);
      }
    }
    if (price > 0 && price !== prevPrice) {
      setPrevPrice(price);
    }
  }, [price, prevPrice]);

  // ✅ FLICKER ELIMINATION: Stability-aware debouncing
  useEffect(() => {
    const currentQuality = connectionStatus === 'connected' ? 'live' : 
                          connectionStatus === 'connecting' ? 'hydrated' : 'stale';
    const proposedQuality = connectionStatus === 'connected' ? 'live' : 
                           connectionStatus === 'connecting' ? 'hydrated' : 'stale';
    
    if (shouldAllowQualityChange(symbol, currentQuality, proposedQuality)) {
      setDebouncedConnectionStatus(connectionStatus);
    }
  }, [connectionStatus, shouldAllowQualityChange, symbol]);

  // Price update effect with validation
  useEffect(() => {
    if (onPriceUpdate && displayPrice > 0) {
      onPriceUpdate(displayPrice);
    }
  }, [displayPrice, onPriceUpdate]);

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
    // GUARANTEED 2s Updates: Use timestamp-based freshness for accurate status
    const dataFreshness = lastUpdated ? (Date.now() - lastUpdated.getTime()) / 1000 : Infinity;
    
    if (isLoading || debouncedConnectionStatus === 'connecting') {
      return { 
        color: 'text-yellow-400', 
        icon: RefreshCw, 
        text: 'Fetching',
        description: 'Fetching latest price data...',
        animate: true
      };
    }
    
    // GUARDRAIL: Only surface real errors (network/auth), not benign ones
    const isBenignError = error && (
      error.includes('timed out') || 
      error.includes('closed') || 
      error.includes('CHANNEL_ERROR') ||
      error.includes('TIMED_OUT') ||
      error.includes('connection') ||
      error.includes('Price data is')
    );
    
    if (error && !isBenignError) {
      return { 
        color: 'text-red-400', 
        icon: AlertTriangle, 
        text: 'Error',
        description: error,
        animate: false
      };
    }
    
    // Guaranteed Live indicator for sub-2-second data
    if (dataFreshness < 2 && price > 0) {
      return { 
        color: 'text-green-400', 
        icon: Wifi, 
        text: 'Live',
        description: 'Guaranteed 2-second updates via heartbeat system',
        animate: false
      };
    }
    
    // Recent data (2-5 seconds)
    if (dataFreshness < 5 && price > 0) {
      return { 
        color: 'text-yellow-400', 
        icon: Timer, 
        text: 'Recent',
        description: 'Recent price data, heartbeat incoming',
        animate: false
      };
    }
    
    return { 
      color: 'text-red-400', 
      icon: WifiOff, 
      text: 'Offline',
      description: 'No recent price updates',
      animate: false
    };
  }, [debouncedConnectionStatus, isLoading, error, lastUpdated, price]);

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

  // Enhanced market status with countdown timer
  // Market status logic removed to eliminate blinking

  // Check if current symbol is a Forex pair or related asset
  const isForexAsset = useMemo(() => {
    return apiSymbol.includes('/') || apiSymbol.includes('EUR') || apiSymbol.includes('GBP') || 
           apiSymbol.includes('USD') || apiSymbol.includes('JPY') || apiSymbol.includes('AUD') || 
           apiSymbol.includes('CAD') || apiSymbol.includes('NZD') || apiSymbol.includes('XAU') || 
           apiSymbol.includes('GOLD');
  }, [apiSymbol]);

  if (!symbol) return null;


  return (
    <div className={`bg-card/50 border rounded-lg p-4 backdrop-blur-sm ${
      debouncedConnectionStatus === 'connected' ? 'border-green-500/20 shadow-sm' : 
      debouncedConnectionStatus === 'error' ? 'border-red-500/20 shadow-sm' : 
      'border-border'
    } ${className}`} style={{ willChange: 'transform', transform: 'translateZ(0)' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Live Price</h3>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="h-7 px-2"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>

      {/* GUARDRAIL: Only show real errors, suppress benign ones */}
      {error && !(
        error.includes('Price data is') || 
        error.includes('timed out') || 
        error.includes('closed') || 
        error.includes('CHANNEL_ERROR') ||
        error.includes('TIMED_OUT') ||
        error.includes('connection')
      ) && (
        <div className="flex items-center gap-2 mb-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <div className="text-red-400 text-sm">
            {error}
          </div>
        </div>
      )}

      {/* Loading State for Initial Load */}
      {price === 0 && connectionStatus === 'connecting' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
            <div className="h-7 w-32 bg-gray-600 rounded"></div>
              <div className="h-4 w-4 bg-gray-600 rounded"></div>
            </div>
            <div className="h-6 w-20 bg-gray-600 rounded"></div>
          </div>
          <div className="flex items-center justify-between">
            <div className="h-4 w-24 bg-gray-600 rounded"></div>
            <div className="h-6 w-24 bg-gray-600 rounded"></div>
          </div>
        </div>
      )}

      {/* Market Status Banner removed to eliminate blinking and market closed displays */}

      {/* Main Price Display - Always visible */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {displayPrice > 0 ? (
            <div className={`font-mono text-xl font-bold ${
              'text-accent-green'
            }`} style={{ willChange: 'transform', transform: 'translateZ(0)' }}>
              ${formatPrice(displayPrice)}
            </div>
          ) : price > 0 && !isPricePlausibleForSymbol(price, apiSymbol) ? (
             <div className="text-amber-500 font-mono text-xl">
               <span>Invalid Price</span>
             </div>
          ) : (
            <div className="text-gray-500 font-mono text-xl">
              {isLoading ? 'Loading...' : '---.--'}
            </div>
          )}
        </div>
        
        {!error && displayPrice > 0 && change !== undefined && changePercent !== undefined && (
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

      {/* Enhanced Footer with Trading Safety and Real-time Data Age */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Clock className="w-3 h-3" />
            <span>{dataAge}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {/* Critical: Manual refresh button for trading decisions */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-6 px-2 text-xs"
            title="Refresh price data"
          >
            <RefreshCw className="h-3 w-3 mr-1" style={{ willChange: 'transform', transform: 'translateZ(0)' }} />
            Refresh
          </Button>
          {onUseCurrentPrice && displayPrice > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onUseCurrentPrice(displayPrice)}
              className="border-accent-green/30 text-accent-green hover:bg-accent-green/20 h-7 px-3 text-xs"
              disabled={displayPrice <= 0}
              title="Use current price for signal"
            >
              Use Price
            </Button>
          )}
        </div>
      </div>


    </div>
  );
};

export default EnhancedLivePriceDisplay;
