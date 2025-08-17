import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, AlertCircle, Wifi, Loader2, Zap, Hourglass, RefreshCw, Clock, WifiOff, AlertTriangle } from 'lucide-react';
import { useOptimizedLivePrice } from '@/hooks/useOptimizedLivePrice';
import { useThrottledPrice } from '@/hooks/useThrottledPrice';
import { useConnectionStabilizer } from '@/hooks/useConnectionStabilizer';
const calculatePips = (entry, current, symbol) => {
  const difference = current - entry;
  if (!symbol) return {
    pips: null,
    points: null,
    difference
  };
  const upperSymbol = symbol.toUpperCase();
  if (upperSymbol.includes('JPY')) {
    return {
      pips: difference / 0.01,
      points: null,
      difference
    };
  }
  if (upperSymbol.startsWith('XAU')) {
    // Gold
    return {
      pips: difference / 0.1,
      points: null,
      difference
    };
  }
  if (upperSymbol.startsWith('BTC')) {
    // Bitcoin
    // For crypto, "pip" isn't standard. We'll call them points.
    return {
      pips: null,
      points: difference,
      difference
    };
  }
  // Standard forex pair
  return {
    pips: difference / 0.0001,
    points: null,
    difference
  };
};
const LivePriceWidgetComponent = ({
  alert,
  onTakeProfitHit,
  onStopLossHit,
  onOrderActivation
}) => {
  // ZERO throttling/debouncing for institutional-grade sub-50ms latency
  const {
    price: currentPrice,
    change,
    changePercent,
    isLoading,
    error,
    lastUpdated,
    connectionStatus,
    dataSource,
    priceUpdateSource,
    refreshPrice
  } = useOptimizedLivePrice(alert.tradermade_symbol, {
    enableSmartPausing: false,
    debounceMs: 0, // ZERO debouncing for maximum speed
    pauseOnInput: false
  });

  const [priceChange, setPriceChange] = useState(null);
  const [lastProcessedPrice, setLastProcessedPrice] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dataAge, setDataAge] = useState('');
  const [prevPrice, setPrevPrice] = useState(0);
  const [priceAnimation, setPriceAnimation] = useState(null);
  const isProcessingRef = useRef(false);
  const lastUpdateRef = useRef(0);

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
    const interval = setInterval(updateAge, 5000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  // Price change animation effect
  useEffect(() => {
    if (currentPrice > 0 && prevPrice > 0 && currentPrice !== prevPrice) {
      setPriceAnimation(currentPrice > prevPrice ? 'up' : 'down');
      const timer = setTimeout(() => setPriceAnimation(null), 1000);
      return () => clearTimeout(timer);
    }
    if (currentPrice > 0) {
      setPrevPrice(currentPrice);
    }
  }, [currentPrice, prevPrice]);
  const processLevelHit = useCallback(async (hitType, data) => {
    if (isProcessingRef.current) {
      console.log(`[PROCESSING SKIP] Already processing ${hitType} for alert ${alert.id}, skipping...`);
      return;
    }
    
    const now = Date.now();
    if (now - lastUpdateRef.current < 5000) {
      console.log(`[RATE LIMITED] ${hitType} check for alert ${alert.id} - Last processed ${now - lastUpdateRef.current}ms ago`);
      return;
    }
    
    isProcessingRef.current = true;
    lastUpdateRef.current = now;
    
    try {
      console.log(`[LEVEL HIT] Processing ${hitType} for alert ${alert.id}:`, {
        ...data,
        currentPrice: currentPrice,
        entryPrice: alert.entry_price,
        tradeType: alert.trade_type,
        assetName: alert.asset_name,
        symbol: alert.tradermade_symbol,
        timestamp: new Date().toISOString(),
        alertStatus: alert.status
      });
      
      // Non-blocking execution - don't await callbacks to prevent UI freezing
      if (hitType === 'tp_hit' && onTakeProfitHit) {
        onTakeProfitHit(alert, data.updatedHits, data.shouldAutoClose, data.autoCloseReason)
          .catch(error => console.error(`[ERROR] TP hit callback failed for ${alert.id}:`, error));
      } else if (hitType === 'stop_loss' && onStopLossHit) {
        onStopLossHit(alert, data.closeReason)
          .catch(error => console.error(`[ERROR] Stop loss callback failed for ${alert.id}:`, error));
      } else if (hitType === 'activation' && onOrderActivation) {
        onOrderActivation(alert)
          .catch(error => console.error(`[ERROR] Activation callback failed for ${alert.id}:`, error));
      }
      
      // Short cooldown to prevent spam
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`[ERROR] Processing ${hitType} for alert ${alert.id}:`, error);
    } finally {
      isProcessingRef.current = false;
    }
  }, [alert, currentPrice, onTakeProfitHit, onStopLossHit, onOrderActivation]);
  const checkLevels = useCallback(price => {
    // Renamed parameter to 'price' to avoid confusion with outer 'currentPrice'
    if (!price || price === lastProcessedPrice || isProcessingRef.current) {
      return;
    }
    if (price <= 0 || !isFinite(price)) {
      console.warn('Invalid price received:', price);
      return;
    }
    setLastProcessedPrice(price);
    const {
      pips,
      points,
      difference
    } = calculatePips(alert.entry_price, price, alert.tradermade_symbol);
    setPriceChange({
      pips,
      points,
      absolute: difference,
      isPositive: difference > 0
    });
    if (alert.status === 'pending') {
      const isBuyLimit = alert.trade_type === 'buy_limit';
      const isSellLimit = alert.trade_type === 'sell_limit';
      const shouldActivate = isBuyLimit && price <= alert.entry_price || isSellLimit && price >= alert.entry_price;
      if (shouldActivate) {
        console.log(`🚀 Order activation triggered for ${alert.asset_name}`);
        processLevelHit('activation', {});
      }
      return;
    }
    if (alert.status !== 'active') {
      return;
    }
    const isBuy = alert.trade_type.includes('buy');
    const currentHits = alert.tp_hits || [];
    const hasAlreadyHitTP = currentHits.length > 0;
    const buffer = alert.entry_price * 0.0001;

    // Enhanced logging for debugging (development only)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[PRICE CHECK] ${alert.asset_name} (${alert.tradermade_symbol}):`, {
        currentPrice: price,
        entryPrice: alert.entry_price,
        tradeType: alert.trade_type,
        stopLoss: alert.stop_loss,
        buffer: buffer,
        currentHits: currentHits,
        isBuy: isBuy
      });
    }

    // Priority 1: Check Stop Loss first (highest priority)
    const stopLossHit = isBuy ? price <= alert.stop_loss - buffer : price >= alert.stop_loss + buffer;
    if (stopLossHit) {
      const closeReason = hasAlreadyHitTP ? 'reversal_after_tp' : 'stop_loss';
      console.log(`💥 [STOP LOSS] Hit for ${alert.asset_name}, reason: ${closeReason}`, {
        currentPrice: price,
        stopLoss: alert.stop_loss,
        buffer: buffer,
        effectiveStopLoss: isBuy ? alert.stop_loss - buffer : alert.stop_loss + buffer
      });
      processLevelHit('stop_loss', {
        closeReason
      });
      return;
    }

    // Priority 2: Validate trade direction before checking TP levels
    const isPriceInProfitDirection = isBuy ? price > alert.entry_price : price < alert.entry_price;
    if (!isPriceInProfitDirection) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DIRECTION CHECK] Price not in profit direction for ${alert.asset_name}:`, {
          currentPrice: price,
          entryPrice: alert.entry_price,
          tradeType: alert.trade_type,
          isPriceInProfitDirection
        });
      }
      // Don't process TP levels if price is not moving in profitable direction
      return;
    }

    // Priority 3: Check Take Profit levels with enhanced validation
    const takeProfits = [{
      level: 1,
      price: alert.tp1
    }, {
      level: 2,
      price: alert.tp2
    }, {
      level: 3,
      price: alert.tp3
    }, {
      level: 4,
      price: alert.tp4
    }, {
      level: 5,
      price: alert.tp5
    }].filter(tp => tp.price && tp.price > 0);

    // Validate TP levels make sense for trade direction
    const invalidTPs = takeProfits.filter(tp => isBuy ? tp.price <= alert.entry_price : tp.price >= alert.entry_price);
    if (invalidTPs.length > 0) {
      console.warn(`[INVALID TP] Invalid TP levels detected for ${alert.asset_name}:`, invalidTPs);
    }
    const validTPs = takeProfits.filter(tp => isBuy ? tp.price > alert.entry_price : tp.price < alert.entry_price);
    const newHits = [];
    validTPs.forEach(tp => {
      const hasHit = isBuy ? price >= tp.price - buffer : price <= tp.price + buffer;
      if (hasHit && !currentHits.includes(tp.level)) {
        // Sequential TP validation: Can't hit TP2 without hitting TP1 first
        if (tp.level > 1 && !currentHits.includes(tp.level - 1)) {
          console.log(`[SEQUENTIAL TP] Skipping TP${tp.level} - TP${tp.level - 1} not hit yet for ${alert.asset_name}`);
          return;
        }
        console.log(`[TP VALIDATION] TP${tp.level} hit for ${alert.asset_name}:`, {
          tpPrice: tp.price,
          currentPrice: price,
          buffer: buffer,
          effectiveTPPrice: isBuy ? tp.price - buffer : tp.price + buffer,
          tradeType: alert.trade_type
        });
        newHits.push(tp.level);
      }
    });
    if (newHits.length > 0) {
      // Final validation: Ensure price movement makes sense
      const largestNewHit = Math.max(...newHits);
      const correspondingTP = validTPs.find(tp => tp.level === largestNewHit);
      if (correspondingTP) {
        const priceMovementValid = isBuy ? price >= correspondingTP.price - buffer : price <= correspondingTP.price + buffer;
        if (!priceMovementValid) {
          console.error(`[VALIDATION FAILED] Price movement validation failed for ${alert.asset_name}:`, {
            currentPrice: price,
            tpLevel: largestNewHit,
            tpPrice: correspondingTP.price,
            expectedCondition: isBuy ? `price >= ${correspondingTP.price - buffer}` : `price <= ${correspondingTP.price + buffer}`
          });
          return;
        }
      }
      const updatedHits = [...currentHits, ...newHits].sort((a, b) => a - b);
      const maxAvailableTP = Math.max(...validTPs.map(tp => tp.level));
      const shouldAutoClose = updatedHits.includes(maxAvailableTP);
      const autoCloseReason = shouldAutoClose ? `tp${maxAvailableTP}` : null;
      console.log(`🎯 [TP CONFIRMED] Valid TP hits for ${alert.asset_name}: ${newHits.join(', ')}`, {
        newHits,
        updatedHits,
        shouldAutoClose,
        autoCloseReason,
        currentPrice: price,
        entryPrice: alert.entry_price
      });
      processLevelHit('tp_hit', {
        updatedHits,
        shouldAutoClose,
        autoCloseReason
      });
    }
  }, [alert, lastProcessedPrice, processLevelHit]);
  useEffect(() => {
    if (currentPrice !== null && currentPrice !== undefined) {
      checkLevels(currentPrice);
    }
  }, [currentPrice, checkLevels]);

  // Debug logging (development only)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`LivePriceWidget Debug for ${alert.asset_name}:`, {
        alertSymbol: alert.tradermade_symbol,
        currentPrice: currentPrice,
        connectionStatus,
        priceUpdateSource,
        entryPrice: alert.entry_price,
        stopLoss: alert.stop_loss
      });
    }
  }, [currentPrice, connectionStatus, priceUpdateSource, alert]);
  // Format price with dynamic decimal places
  const formatPrice = useCallback((price) => {
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

  const formatTime = useCallback((date) => {
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
    
    if (error) {
      return { 
        color: 'text-red-400', 
        icon: AlertTriangle, 
        text: 'Error',
        description: 'Failed to fetch price data',
        animate: false
      };
    }
    
    if (connectionStatus === 'connected') {
      switch (priceUpdateSource) {
        case 'websocket':
          return { 
            color: 'text-green-400', 
            icon: Wifi, 
            text: '⚡ Real-time',
            description: 'Live WebSocket updates active',
            animate: false
          };
        case 'http':
          return { 
            color: 'text-blue-400', 
            icon: RefreshCw, 
            text: '🔄 HTTP Fallback',
            description: 'Using HTTP API fallback mode',
            animate: false
          };
        default:
          if (dataFreshness < 30) {
            return { 
              color: 'text-green-400', 
              icon: Wifi, 
              text: 'Live',
              description: 'Real-time price updates active',
              animate: false
            };
          }
      }
    }
    
    return { 
      color: 'text-gray-400', 
      icon: Wifi, 
      text: 'Live',
      description: 'Price updates active',
      animate: false
    };
  }, [connectionStatus, error, lastUpdated, priceUpdateSource]);

  // Handle refresh with loading state
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshPrice();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const priceChangeColor = useMemo(() => {
    return change >= 0 ? 'text-green-400' : 'text-red-400';
  }, [change]);

  const priceChangeIcon = useMemo(() => {
    return change >= 0 ? TrendingUp : TrendingDown;
  }, [change]);

  const profitLossDisplay = useMemo(() => {
    if (!priceChange) return null;
    const isBuy = alert.trade_type.includes('buy');
    const isProfit = isBuy ? priceChange.isPositive : !priceChange.isPositive;
    let valueText;
    if (priceChange.pips !== null) {
      valueText = `${priceChange.pips.toFixed(1)} pips`;
    } else if (priceChange.points !== null) {
      valueText = `${priceChange.points.toFixed(2)} pts`;
    } else {
      valueText = 'N/A';
    }
    return {
      isProfit,
      color: isProfit ? 'text-emerald-400' : 'text-red-400',
      bgColor: isProfit ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-red-500/20 border-red-500/30',
      valueText,
      sign: priceChange.isPositive ? '+' : ''
    };
  }, [priceChange, alert.trade_type]);

  if (!alert.tradermade_symbol) return null;

  // Pending order state
  if (alert.status === 'pending') {
    const isBuyLimit = alert.trade_type === 'buy_limit';
    const isSellLimit = alert.trade_type === 'sell_limit';
    
    return (
      <div className="bg-card/50 border border-border rounded-lg p-4 backdrop-blur-sm transition-all duration-300 border-amber-500/30 shadow-amber-500/10 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="text-white font-medium">
              Live Price for {alert.asset_name}
            </div>
            <div className="flex items-center gap-1 text-xs text-amber-400">
              <Hourglass className="w-3 h-3" />
              <span>{isBuyLimit ? 'Buy Limit' : isSellLimit ? 'Sell Limit' : 'Pending Order'}</span>
              {dataAge && (
                <>
                  <span className="text-gray-500">•</span>
                  <span className={dataAge === 'Live' ? 'text-green-400' : dataAge === 'Stale' ? 'text-red-400' : 'text-yellow-400'}>
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
            <RefreshCw className={`w-4 h-4 ${isLoading || isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`font-mono text-xl font-bold transition-all duration-300 ${
              priceAnimation === 'up' ? 'text-green-400 animate-pulse bg-green-400/10 px-2 py-1 rounded' :
              priceAnimation === 'down' ? 'text-red-400 animate-pulse bg-red-400/10 px-2 py-1 rounded' :
              'text-accent-green'
            }`}>
              ${currentPrice ? formatPrice(currentPrice) : '---.--'}
            </div>
            
          </div>
          
          {!error && currentPrice > 0 && (
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

        <div className="text-center text-sm text-gray-300 border-t border-amber-700 pt-2">
          <span className="text-amber-400 font-bold">
            {isBuyLimit ? 'Waiting for price to drop to' : isSellLimit ? 'Waiting for price to rise to' : 'Entry at'}
          </span>
          <br />
          <span className="font-bold text-white">${alert.entry_price.toFixed(2)}</span>
        </div>

{/* Hidden meta section (Source/Symbol/Price) per request */}
      </div>
    );
  }

  return (
    <div className={`bg-card/50 border border-border rounded-lg p-4 backdrop-blur-sm transition-all duration-300 ${
      connectionStatus === 'connected' ? 'border-green-500/30 shadow-green-500/10 shadow-lg' : 
      connectionStatus === 'error' ? 'border-red-500/30 shadow-red-500/10 shadow-lg' : 
      'border-border'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="text-white font-medium">
            Live Price for {alert.asset_name}
          </div>
          <div className={`flex items-center gap-1 text-xs ${connectionStatusInfo.color}`}>
            <connectionStatusInfo.icon 
              className="w-3 h-3" 
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
          <RefreshCw className={`w-4 h-4 ${isLoading || isRefreshing ? 'animate-spin' : ''}`} />
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
      {isLoading && currentPrice === 0 && (
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
      {(currentPrice > 0 || !isLoading) && (
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {error ? (
              <div className="text-gray-500 font-mono text-xl">---.--</div>
            ) : (
              <div className={`font-mono text-xl font-bold transition-all duration-300 ${
                priceAnimation === 'up' ? 'text-green-400 animate-pulse bg-green-400/10 px-2 py-1 rounded' :
                priceAnimation === 'down' ? 'text-red-400 animate-pulse bg-red-400/10 px-2 py-1 rounded' :
                'text-accent-green'
              }`}>
                ${formatPrice(currentPrice)}
              </div>
            )}
          </div>
          
          {!error && currentPrice > 0 && (
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

      {/* P&L from Entry Display */}
      {priceChange && profitLossDisplay && (
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            {profitLossDisplay.isProfit ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-red-400" />}
            <span className="text-sm text-gray-300">P/L from Entry</span>
          </div>
          <div className="text-right space-y-1">
            <Badge className={profitLossDisplay.bgColor}>
              <span className={profitLossDisplay.color}>
                {profitLossDisplay.sign}{profitLossDisplay.valueText}
              </span>
            </Badge>
            <div className={`text-xs ${profitLossDisplay.color}`}>
              {priceChange.isPositive ? '+' : ''}${Math.abs(priceChange.absolute).toFixed(2)}
            </div>
          </div>
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
      </div>
    </div>
  );
};
export const LivePriceWidget = memo(LivePriceWidgetComponent);
export default LivePriceWidget;
