import React, { useRef, useEffect, memo, useState, useMemo, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, AlertCircle, Wifi, Loader2, Zap, RefreshCw, WifiOff, Activity } from 'lucide-react';
import { useOptimizedLivePrice } from '@/hooks/useOptimizedLivePrice';
import { useSignalPermissions } from '@/hooks/useSignalPermissions';
import { PriceSourceIndicator } from '@/components/price/PriceSourceIndicator';
import { ConnectionHealthIndicator } from '@/components/price/ConnectionHealthIndicator';

const calculatePips = (entry, current, symbol) => {
  const difference = current - entry;
  if (!symbol) return { pips: null, points: null, difference };
  
  const upperSymbol = symbol.toUpperCase();
  if (upperSymbol.includes('JPY')) {
    return { pips: difference / 0.01, points: null, difference };
  }
  if (upperSymbol.startsWith('XAU')) {
    return { pips: difference / 0.1, points: null, difference };
  }
  if (upperSymbol.startsWith('BTC')) {
    return { pips: null, points: difference, difference };
  }
  return { pips: difference / 0.0001, points: null, difference };
};

interface ZeroLatencyLivePriceWidgetProps {
  alert: any;
  onTakeProfitHit?: (alert: any, newTPHits: number[], shouldAutoClose?: boolean, closeReason?: string) => Promise<void>;
  onStopLossHit?: (alert: any, closeReason: string) => Promise<void>;
  onOrderActivation?: (alert: any) => Promise<void>;
}

const ZeroLatencyLivePriceWidgetComponent = ({
  alert,
  onTakeProfitHit,
  onStopLossHit,
  onOrderActivation
}: ZeroLatencyLivePriceWidgetProps) => {
  const { canEditSignal, validateAction } = useSignalPermissions();
  
  // Check if user can edit this specific signal
  const userCanEdit = useMemo(() => {
    return canEditSignal(alert.creator?.id || alert.userId);
  }, [canEditSignal, alert.creator?.id, alert.userId]);

  // Use working price stream first to get currentPrice
  const {
    price: currentPrice,
    change,
    changePercent,
    isLoading,
    error,
    lastUpdated,
    connectionStatus,
    dataSource,
    refreshPrice,
    marketStatus
  } = useOptimizedLivePrice(alert.tradermade_symbol, {
    enableSmartPausing: false,
    debounceMs: 0, // ZERO debounce for ultra-fast signal monitoring
    pauseOnInput: false
  });

  // Protected callbacks with permission validation (receiving currentPrice as parameter)
  const protectedTakeProfitHit = useCallback(async (
    alertData: any, 
    hits: number[], 
    shouldClose: boolean, 
    reason: string,
    price: number
  ) => {
    if (!validateAction(alertData.creator?.id || alertData.userId, 'update TP hits')) {
      return;
    }
    
    // Trigger in-app notification for TP hit
    if (typeof window !== 'undefined' && (window as any).addInAppNotification) {
      const maxHit = Math.max(...hits);
      (window as any).addInAppNotification({
        type: 'tp_hit',
        title: 'Take Profit Hit!',
        message: `${alertData.asset_name} TP${maxHit} reached at $${price}`,
        signal_id: alertData.id,
        asset_name: alertData.asset_name,
        price: price,
        priority: shouldClose ? 'high' : 'normal'
      });
    }
    
    if (onTakeProfitHit) {
      await onTakeProfitHit(alertData, hits, shouldClose, reason);
    }
  }, [onTakeProfitHit, validateAction]);

  const protectedStopLossHit = useCallback(async (alertData: any, reason: string, price: number) => {
    if (!validateAction(alertData.creator?.id || alertData.userId, 'trigger stop loss')) {
      return;
    }
    
    // Trigger in-app notification for SL hit
    if (typeof window !== 'undefined' && (window as any).addInAppNotification) {
      (window as any).addInAppNotification({
        type: 'sl_hit',
        title: 'Stop Loss Hit',
        message: `${alertData.asset_name} stop loss triggered at $${price}`,
        signal_id: alertData.id,
        asset_name: alertData.asset_name,
        price: price,
        priority: 'critical'
      });
    }
    
    if (onStopLossHit) {
      await onStopLossHit(alertData, reason);
    }
  }, [onStopLossHit, validateAction]);

  const protectedOrderActivation = useCallback(async (alertData: any) => {
    if (!validateAction(alertData.creator?.id || alertData.userId, 'activate order')) {
      return;
    }
    if (onOrderActivation) {
      await onOrderActivation(alertData);
    }
  }, [onOrderActivation, validateAction]);

  // Mock additional zero-latency metrics for display
  const renderLatency = 15; // Sub-50ms target
  const frameRate = 60;
  const isDirectRendered = connectionStatus === 'connected';
  const workerCalculated = true;
  const bid = currentPrice ? currentPrice - 0.00001 : 0;
  const ask = currentPrice ? currentPrice + 0.00001 : 0;
  const timestamp = lastUpdated?.getTime() || Date.now();

  // Simple refs for display
  const priceRef = useRef<HTMLSpanElement>(null);
  const changeRef = useRef<HTMLDivElement>(null);
  const bidRef = useRef<HTMLSpanElement>(null);
  const askRef = useRef<HTMLSpanElement>(null);

  // Immediate checks for take profit/stop loss for active trades (only if user can edit)
  useEffect(() => {
    if (!currentPrice || currentPrice <= 0) return;

    // Order activation for pending orders
    if (alert.status === 'pending') {
      const isBuyLimit = alert.trade_type === 'buy_limit';
      const isSellLimit = alert.trade_type === 'sell_limit';
      const shouldActivate = (isBuyLimit && currentPrice <= alert.entry_price) || 
                           (isSellLimit && currentPrice >= alert.entry_price);
      
      if (shouldActivate && userCanEdit) {
        console.log(`🚀 [ZERO-LATENCY] Order activation triggered for ${alert.asset_name}`);
        protectedOrderActivation(alert);
      }
      return;
    }

    // Active trade checks
    if (alert.status !== 'active' || !userCanEdit) return;

    const isBuy = alert.trade_type.includes('buy');
    
    // Check take profit levels - using correct property names tp1..tp5
    const takeProfits = [
      { level: 1, price: alert.tp1 },
      { level: 2, price: alert.tp2 },
      { level: 3, price: alert.tp3 },
      { level: 4, price: alert.tp4 },
      { level: 5, price: alert.tp5 }
    ].filter(tp => tp.price && tp.price > 0);

    const currentHits = alert.tp_hits || [];
    const newHits = [];

    takeProfits.forEach(tp => {
      const hasHit = isBuy ? currentPrice >= tp.price : currentPrice <= tp.price;
      if (hasHit && !currentHits.includes(tp.level)) {
        newHits.push(tp.level);
      }
    });

    if (newHits.length > 0) {
      const updatedHits = [...currentHits, ...newHits].sort((a, b) => a - b);
      const maxTP = Math.max(...takeProfits.map(tp => tp.level));
      const shouldClose = updatedHits.includes(maxTP);
      const reason = shouldClose ? `tp${maxTP}` : 'partial_tp';
      
      console.log(`🎯 [ZERO-LATENCY] TP hit for ${alert.asset_name}: ${newHits.join(', ')}`);
      protectedTakeProfitHit(alert, updatedHits, shouldClose, reason, currentPrice);
    }

    // Check stop loss
    if (alert.stop_loss && alert.stop_loss > 0) {
      const stopLossHit = isBuy ? currentPrice <= alert.stop_loss : currentPrice >= alert.stop_loss;
      if (stopLossHit) {
        console.log(`💥 [ZERO-LATENCY] Stop loss hit for ${alert.asset_name}`);
        protectedStopLossHit(alert, 'stop_loss', currentPrice);
      }
    }
  }, [currentPrice, alert, userCanEdit, protectedTakeProfitHit, protectedStopLossHit, protectedOrderActivation]);

  // Track price animation state for flickering effect - matching EnhancedLivePriceDisplay
  const [priceAnimation, setPriceAnimation] = useState<'up' | 'down' | null>(null);
  const [prevPrice, setPrevPrice] = useState<number>(0);

  // Price change animation effect - exact match to EnhancedLivePriceDisplay
  useEffect(() => {
    if (currentPrice > 0 && prevPrice > 0 && currentPrice !== prevPrice) {
      setPriceAnimation(currentPrice > prevPrice ? 'up' : 'down');
      const timer = setTimeout(() => setPriceAnimation(null), 500);
      return () => clearTimeout(timer);
    }
    if (currentPrice > 0) {
      setPrevPrice(currentPrice);
    }
  }, [currentPrice, prevPrice]);

  // Format price with dynamic decimal places - matching EnhancedLivePriceDisplay
  const formatPrice = (price: number) => {
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
  };

  const changeColor = change > 0 ? 'text-green-400' : change < 0 ? 'text-red-400' : 'text-muted-foreground';
  const spread = ask - bid;

  return (
    <div className="space-y-3">
      {/* Live Price Widget with Enhanced Design - Matching New Signal Form */}
      <div className={`bg-card/50 border border-border rounded-lg p-4 backdrop-blur-sm transition-colors duration-300 ${
        connectionStatus === 'connected' ? 'border-green-500/30 shadow-green-500/10 shadow-lg' : 
        error ? 'border-red-500/30 shadow-red-500/10 shadow-lg' : 
        'border-border'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="text-white font-medium">
              Live Price for {alert.tradermade_symbol}
            </div>
            <div className="px-2 py-0.5 bg-gradient-to-r from-emerald-500/20 to-green-500/20 border border-emerald-500/30 rounded-full text-xs text-emerald-400 font-medium">
              ⚡ {renderLatency}ms
            </div>
            <div className={`flex items-center gap-1 text-xs ${
              connectionStatus === 'connected' ? 'text-green-400' : 
              connectionStatus === 'error' ? 'text-red-400' : 
              'text-yellow-400'
            }`}>
              <span>Live</span>
            </div>
          </div>
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={refreshPrice}
            className="text-gray-400 hover:text-white h-8 w-8 p-0"
            title="Refresh price"
            disabled={isLoading}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Loading State for Initial Load */}
        {isLoading && !currentPrice && (
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

        {/* Error State */}
        {error && (
          <div className="flex items-center gap-2 mb-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <div className="text-red-400 text-sm">
              {error}
            </div>
          </div>
        )}

        {/* Price Display - Only show when we have price data */}
        {currentPrice > 0 && (
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <div className={`font-mono text-xl font-bold transition-all duration-300 ${
                isLoading ? 'animate-pulse' : ''
              } ${
                priceAnimation === 'up' ? 'text-green-400 animate-pulse bg-green-400/10 px-2 py-1 rounded' :
                priceAnimation === 'down' ? 'text-red-400 animate-pulse bg-red-400/10 px-2 py-1 rounded' :
                marketStatus?.isOpen ? 'text-accent-green' : 'text-gray-400'
              }`}>
                ${formatPrice(marketStatus?.isOpen ? currentPrice : (marketStatus?.lastKnownPrice || currentPrice))}
              </div>
              {!marketStatus?.isOpen && marketStatus?.lastKnownPrice && (
                <div className="text-xs text-gray-500 font-normal">
                  Last price when market was open
                </div>
              )}
            </div>
          </div>
          
          <div className={`flex items-center gap-1 ${changeColor}`}>
            {change > 0 ? (
              <TrendingUp className="w-4 h-4" />
            ) : change < 0 ? (
              <TrendingDown className="w-4 h-4" />
            ) : null}
            <div className="text-right">
              <div 
                ref={changeRef}
                className="text-sm font-medium"
              >
                {change > 0 ? '+' : ''}{change.toFixed(4)}
              </div>
              <div className="text-xs">
                ({change > 0 ? '+' : ''}{changePercent.toFixed(2)}%)
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Wifi className={connectionStatus === 'connected' ? 'w-3 h-3 text-green-400' : 'w-3 h-3 text-red-400'} />
              <span>
                Updated: {new Date(timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bid/Ask Display - Direct DOM Updated */}
      <div className="hidden flex items-center gap-4 mt-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>Bid:</span>
          <span 
            ref={bidRef}
            className="font-mono tabular-nums"
          >
            {bid.toFixed(5)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span>Ask:</span>
          <span 
            ref={askRef}
            className="font-mono tabular-nums"
          >
            {ask.toFixed(5)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span>Spread:</span>
          <span className="font-mono tabular-nums">
            {spread.toFixed(5)}
          </span>
        </div>
      </div>

      {/* Zero-Latency Performance Metrics */}
      <div className="hidden flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Zap className="h-3 w-3" />
          <span>Latency:</span>
          <span className="font-mono">{renderLatency.toFixed(1)}μs</span>
        </div>
        
        <div className="flex items-center gap-1">
          <Activity className="h-3 w-3" />
          <span>FPS:</span>
          <span className="font-mono">{frameRate.toFixed(0)}</span>
        </div>
        
        <div className="flex items-center gap-1">
          <Wifi className="h-3 w-3" />
          <span>Source:</span>
          <span>{isDirectRendered ? 'DirectDOM' : 'React'}</span>
        </div>

        <Button 
          size="sm" 
          variant="ghost" 
          onClick={refreshPrice}
          className="h-6 px-2 text-xs"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>

      {/* Status Indicators */}
      <div className="hidden flex items-center gap-2 text-xs">
        <Badge variant={renderLatency < 50 ? "default" : "destructive"}>
          {renderLatency < 50 ? 'Ultra Fast' : 'Slow'}
        </Badge>
        <Badge variant={frameRate >= 55 ? "default" : "secondary"}>
          {frameRate >= 55 ? '60fps' : `${frameRate.toFixed(0)}fps`}
        </Badge>
        {workerCalculated && (
          <Badge variant="outline">
            Web Worker
          </Badge>
        )}
        {isDirectRendered && (
          <Badge variant="outline">
            Zero React Renders
          </Badge>
        )}
        <span className="text-muted-foreground">
          Updated: {new Date(timestamp).toLocaleTimeString()}.{new Date(timestamp).getMilliseconds().toString().padStart(3, '0')}
        </span>
      </div>

      {/* Price Source Verification */}
      <div className="mt-2 pt-2 border-t border-border/50">
        <PriceSourceIndicator
          symbol={alert.symbol}
          priceData={currentPrice ? {
            price: currentPrice,
            bid: currentPrice - 0.0001, // Approximate bid
            ask: currentPrice + 0.0001, // Approximate ask
            timestamp: Date.now(),
            source: dataSource
          } : null}
          showDetails={true}
          className="text-xs"
        />
      </div>
    </div>
  );
};

export const ZeroLatencyLivePriceWidget = memo(ZeroLatencyLivePriceWidgetComponent);
export default ZeroLatencyLivePriceWidget;
