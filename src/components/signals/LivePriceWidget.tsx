import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, AlertCircle, Wifi, Loader2, Zap, Hourglass, RefreshCw, Clock, WifiOff, AlertTriangle, Timer, Database } from 'lucide-react';
import { useOptimizedLivePrice } from '@/hooks/useOptimizedLivePrice';
import { useEnhancedLivePrice } from '@/hooks/useLivePrice';
import { isDevToolsEnabled } from '@/utils/featureFlags';
import { LivePriceWidgetErrorBoundary } from '@/components/ui/LivePriceWidgetErrorBoundary';
import { LivePriceWidgetProps } from '@/types/components';

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
// Use a module-level Map for cross-instance deduplication
const globalLevelHitMap = new Map<string, number>();

const LivePriceWidgetComponent = ({
  alert,
  onTakeProfitHit,
  onStopLossHit,
  onOrderActivation,
  allowAutomation = true
}) => {
  // Move hooks inside the component
  const levelHitRef = useRef(globalLevelHitMap);
  const [localClosed, setLocalClosed] = useState(false);
  // Use the optimized live price hook directly
  // ✅ SINGLE SOURCE OF TRUTH: Use only useOptimizedLivePrice for subscription
  // This is the AUTHORITATIVE hook that manages the WebSocket subscription
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
    debounceMs: 120, // Business Plan: Ultra-fast 120ms for live price tickers
    pauseOnInput: false,
    trackDataAge: false // Prevent data age interval to eliminate flickering
  });

  // ✅ Get connection quality from consumer hook (no additional subscription)
  const { connectionQuality } = useEnhancedLivePrice(alert.tradermade_symbol);

  const [priceChange, setPriceChange] = useState(null);
  const [lastProcessedPrice, setLastProcessedPrice] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [prevPrice, setPrevPrice] = useState(0);
  const isProcessingRef = useRef(false);
  const lastUpdateRef = useRef(0);


  // Data age tracking removed to prevent blinking and forced refreshes

  // Remove grace period - instant status updates for "Hydrate and Highlight"
  useEffect(() => {
    setDisplayStatus(connectionStatus);
  }, [connectionStatus]);
  // Disable price animations to prevent flicker; track last price only
  useEffect(() => {
    if (currentPrice > 0) {
      setPrevPrice(currentPrice);
    }
  }, [currentPrice]);

  const processLevelHit = useCallback(async (hitType, data) => {
    // Skip automation if not allowed (for non-owners)
    if (!allowAutomation) {
      console.log(`[AUTOMATION SKIP] Level hit automation disabled for non-owner`);
      return;
    }
    
    if (isProcessingRef.current) {
      console.log(`[PROCESSING SKIP] Already processing ${hitType} for alert ${alert.id}, skipping...`);
      return;
    }
    const now = Date.now();
    if (now - lastUpdateRef.current < 2000) { // Reduced from 5000ms to 2000ms for better responsiveness
      return; // Removed rate limit logging to reduce console spam
    }
    isProcessingRef.current = true;
    lastUpdateRef.current = now;
    try {
      // Enhanced logging with detailed context
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
      if (hitType === 'tp_hit' && onTakeProfitHit) {
        await onTakeProfitHit(alert, data.updatedHits, data.shouldAutoClose, data.autoCloseReason);
      } else if (hitType === 'stop_loss' && onStopLossHit) {
        await onStopLossHit(alert, data.closeReason);
      } else if (hitType === 'activation' && onOrderActivation) {
        await onOrderActivation(alert);
      }
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) {
      console.error(`[ERROR] Processing ${hitType} for alert ${alert.id}:`, error);
    } finally {
      isProcessingRef.current = false;
    }
  }, [alert, currentPrice, onTakeProfitHit, onStopLossHit, onOrderActivation, allowAutomation]);
  // Enhanced level checking with better logic
  const checkLevels = useCallback(price => {
    // Sanity guardrails: only run if alert is active/partially_profited and not locally closed
    if (!alert || localClosed || !['active', 'partially_profited'].includes(alert.status)) {
      return;
    }
    // Check for price change and apply deduplication
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
    if (alert.status !== 'active' && alert.status !== 'partially_profited') {
      return;
    }
    const isBuy = alert.trade_type.includes('buy');
    const currentHits = alert.tp_hits || [];
    const hasAlreadyHitTP = currentHits.length > 0;
    const buffer = alert.entry_price * 0.0001;

    // Enhanced logging for debugging
    if (isDevToolsEnabled()) {
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
      const hitKey = `${alert.id}:stop_loss`;
      const lastHit = levelHitRef.current.get(hitKey);
      const now = Date.now();
      
      // One-and-done: prevent duplicate hits within 5 minutes
      if (lastHit && (now - lastHit) < 300000) return;
      levelHitRef.current.set(hitKey, now);
      
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
      if (isDevToolsEnabled()) {
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
      // Check for existing TP hits to prevent duplicates
      newHits.forEach(tp => {
        const hitKey = `${alert.id}:tp_${tp}`;
        const lastHit = levelHitRef.current.get(hitKey);
        const now = Date.now();
        
        // One-and-done: prevent duplicate TP hits within 5 minutes
        if (lastHit && (now - lastHit) < 300000) {
          console.log(`[DEDUPE] TP${tp} hit already processed within 5 minutes`);
          return;
        }
        levelHitRef.current.set(hitKey, now);
      });
      
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

  // Debug logging
  useEffect(() => {
    if (isDevToolsEnabled()) {
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

  const [displayStatus, setDisplayStatus] = useState(connectionStatus); // Stable status with grace period

  const connectionStatusInfo = useMemo(() => {
    if (error) {
      return { 
        color: 'text-red-400', 
        icon: AlertTriangle, 
        text: 'Error',
        description: 'Failed to fetch price data',
        animate: false
      };
    }
    
    switch (connectionQuality) {
      case 'live':
        return { 
          color: 'text-green-400', 
          icon: Wifi, 
          text: 'Live',
          description: 'Real-time price updates',
          animate: false
        };
      case 'hydrated':
        return { 
          color: 'text-yellow-400', 
          icon: Wifi, 
          text: 'Live',
          description: 'Database data - loading live updates',
          animate: false
        };
      case 'stale':
        return { 
          color: 'text-red-400', 
          icon: WifiOff, 
          text: 'Stale',
          description: 'Connection issues - data may be outdated',
          animate: false
        };
      default:
        return { 
          color: 'text-muted-foreground', 
          icon: WifiOff, 
          text: 'No Data',
          description: 'No connection to price data',
          animate: false
        };
    }
   }, [connectionQuality, error]);

  // Handle refresh with loading state
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshPrice();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Enhanced displayPrice with better fallback chain
  const displayPrice = useMemo(() => {
    return currentPrice > 0 ? currentPrice : (prevPrice > 0 ? prevPrice : 0);
  }, [currentPrice, prevPrice]);

  const priceChangeColor = useMemo(() => {
    return change >= 0 ? 'text-green-400' : 'text-red-400';
  }, [change]);

  const priceChangeIcon = useMemo(() => {
    return change >= 0 ? TrendingUp : TrendingDown;
  }, [change]);

  // Market status logic removed to eliminate blinking

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
      <div className="bg-card/50 border border-border rounded-lg p-3 backdrop-blur-sm transition-colors duration-300 border-amber-500/30 shadow-amber-500/10 shadow-lg">
        
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <div className="text-white text-sm font-medium">
              Live Price for {alert.asset_name}
            </div>
            <div className="flex items-center gap-1 text-xs text-amber-400">
              <Hourglass className="w-3 h-3" />
              <span>{isBuyLimit ? 'Buy Limit' : isSellLimit ? 'Sell Limit' : 'Pending Order'}</span>
              {/* removed data age display */}
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

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
              <div className="font-mono text-lg font-bold px-1.5 py-0.5 rounded">
                <span className={`transition-colors duration-200`}>
                  ${displayPrice > 0 ? formatPrice(displayPrice) : '---'}
                </span>
              </div>
            
          </div>
          
          {!error && displayPrice > 0 && (
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

        <div className="text-center text-sm text-gray-300 border-t border-amber-700 pt-1.5">
          <span className="text-amber-400 font-bold text-xs">
            {isBuyLimit ? 'Waiting for price to drop to' : isSellLimit ? 'Waiting for price to rise to' : 'Entry at'}
          </span>
          <br />
          <span className="font-bold text-white text-sm">${alert.entry_price.toFixed(2)}</span>
        </div>

{/* Hidden meta section (Source/Symbol/Price) per request */}
      </div>
    );
  }

  return (
    <div className="bg-card/50 border border-border rounded-lg p-3 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <div className="text-white text-sm font-medium">
            Live Price for {alert.asset_name}
          </div>
          <div className={`flex items-center gap-1 text-xs ${connectionStatusInfo.color}`}>
            <connectionStatusInfo.icon 
              className="w-3 h-3" 
            />
            <span>{connectionStatusInfo.text}</span>
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

      {/* Error State - suppress transient connection errors */}
      {error && !error.includes('TIMED_OUT') && !error.includes('CLOSED') && !error.includes('Price data is') && (
        <div className="flex items-center gap-2 mb-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <div className="text-red-400 text-sm">
            Connection Error
          </div>
        </div>
      )}


      {/* Price Display */}
      {(displayPrice > 0 || !isLoading) && (
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {displayPrice > 0 ? (
              <div className="font-mono text-lg font-bold px-1.5 py-0.5 rounded">
                <span className={`transition-colors duration-200 text-accent-green`}>
                  ${formatPrice(displayPrice)}
                </span>
              </div>
            ) : (
              <div className="text-muted-foreground font-mono text-lg min-h-[28px] flex items-center">
                <span>---</span>
              </div>
            )}
          </div>
          
          {!error && displayPrice > 0 && (
            <div className={`flex items-center gap-0.5 ${priceChangeColor}`}>
              {React.createElement(priceChangeIcon, { className: "w-3 h-3" })}
              <div className="text-right">
                <div className="text-xs font-medium">
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
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-1.5">
            {profitLossDisplay.isProfit ? <TrendingUp className="w-3 h-3 text-emerald-400" /> : <TrendingDown className="w-3 h-3 text-red-400" />}
            <span className="text-xs text-gray-300">P/L from Entry</span>
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

// 🚀 REACT QUEUE HARDENING: Wrap component with specialized ErrorBoundary
const LivePriceWidgetWithErrorBoundary = memo((props: LivePriceWidgetProps) => (
  <LivePriceWidgetErrorBoundary symbol={props.alert?.tradermade_symbol}>
    <LivePriceWidgetComponent {...props} />
  </LivePriceWidgetErrorBoundary>
));

export const LivePriceWidget = LivePriceWidgetWithErrorBoundary;
export default LivePriceWidget;
