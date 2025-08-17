import React, { useState, useEffect, useRef, memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, AlertCircle, Wifi, Loader2, Zap, RefreshCw, WifiOff } from 'lucide-react';
import { useFIXRealTimePrice } from '@/hooks/useFIXRealTimePrice';

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

interface UltraFastLivePriceWidgetProps {
  alert: any;
  onTakeProfitHit?: (level: number) => void;
  onStopLossHit?: () => void;
  onOrderActivation?: () => void;
}

const UltraFastLivePriceWidgetComponent = ({
  alert,
  onTakeProfitHit,
  onStopLossHit,
  onOrderActivation
}: UltraFastLivePriceWidgetProps) => {
  // ZERO-latency FIX-style price feed
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
    refreshPrice,
    tickLatency,
    tickCount
  } = useFIXRealTimePrice(alert.tradermade_symbol);

  const [priceAnimation, setPriceAnimation] = useState<'up' | 'down' | null>(null);
  const [prevPrice, setPrevPrice] = useState(0);
  const priceRef = useRef<HTMLSpanElement>(null);
  const animationRef = useRef<number>();

  // Direct DOM manipulation for zero-latency price updates
  useEffect(() => {
    if (!currentPrice || currentPrice === prevPrice) return;

    // Cancel any pending animation frame
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    // Immediate DOM update bypassing React batching
    animationRef.current = requestAnimationFrame(() => {
      if (priceRef.current) {
        priceRef.current.textContent = currentPrice.toFixed(5);
        
        // Flash animation for price movement
        const direction = currentPrice > prevPrice ? 'up' : 'down';
        setPriceAnimation(direction);
        
        // Clear animation after 150ms
        setTimeout(() => setPriceAnimation(null), 150);
      }
    });

    setPrevPrice(currentPrice);

    // Check for order triggers with zero delay
    if (alert.status === 'pending' && alert.entry_price && currentPrice) {
      const shouldActivate = 
        (alert.direction === 'buy' && currentPrice >= alert.entry_price) ||
        (alert.direction === 'sell' && currentPrice <= alert.entry_price);
      
      if (shouldActivate) {
        onOrderActivation?.();
      }
    }

    // Immediate TP/SL checks for active trades
    if (alert.status === 'active' && alert.entry_price && currentPrice) {
      const pipsInfo = calculatePips(alert.entry_price, currentPrice, alert.tradermade_symbol);
      
      // Stop Loss check
      if (alert.stop_loss) {
        const shouldStopLoss = 
          (alert.direction === 'buy' && currentPrice <= alert.stop_loss) ||
          (alert.direction === 'sell' && currentPrice >= alert.stop_loss);
        
        if (shouldStopLoss) {
          onStopLossHit?.();
        }
      }

      // Take Profit checks (immediate execution)
      if (alert.take_profit_1 && currentPrice) {
        const shouldTP1 = 
          (alert.direction === 'buy' && currentPrice >= alert.take_profit_1) ||
          (alert.direction === 'sell' && currentPrice <= alert.take_profit_1);
        
        if (shouldTP1) onTakeProfitHit?.(1);
      }

      if (alert.take_profit_2 && currentPrice) {
        const shouldTP2 = 
          (alert.direction === 'buy' && currentPrice >= alert.take_profit_2) ||
          (alert.direction === 'sell' && currentPrice <= alert.take_profit_2);
        
        if (shouldTP2) onTakeProfitHit?.(2);
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [currentPrice, alert, onTakeProfitHit, onStopLossHit, onOrderActivation, prevPrice]);

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive">
        <AlertCircle className="h-4 w-4" />
        <span>Price Error: {error}</span>
        <Button size="sm" variant="outline" onClick={refreshPrice}>
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  if (isLoading || !currentPrice) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading ultra-fast price feed...</span>
      </div>
    );
  }

  const isConnected = connectionStatus === 'connected';
  const changeColor = change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-muted-foreground';
  const priceChangeClass = priceAnimation === 'up' ? 'bg-green-100 dark:bg-green-900/20' : 
                          priceAnimation === 'down' ? 'bg-red-100 dark:bg-red-900/20' : '';

  return (
    <div className="space-y-2">
      {/* Ultra-Fast Price Display */}
      <div className="flex items-center gap-3">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors duration-150 ${priceChangeClass}`}>
          <span className="text-sm font-medium text-muted-foreground">
            {alert.tradermade_symbol}
          </span>
          <span 
            ref={priceRef}
            className="text-xl font-bold tabular-nums"
          >
            {currentPrice.toFixed(5)}
          </span>
          <div className="flex items-center gap-1">
            {change > 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : change < 0 ? (
              <TrendingDown className="h-4 w-4 text-red-600" />
            ) : null}
            <span className={`text-sm font-medium ${changeColor}`}>
              {change > 0 ? '+' : ''}{changePercent.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          {isConnected ? (
            <Wifi className="h-3 w-3 text-green-600" />
          ) : (
            <WifiOff className="h-3 w-3 text-red-600" />
          )}
          <span>{connectionStatus}</span>
        </div>
        
        <div className="flex items-center gap-1">
          <Zap className="h-3 w-3" />
          <span>{tickLatency.toFixed(0)}μs</span>
        </div>
        
        <div className="flex items-center gap-1">
          <span>Ticks: {tickCount}</span>
        </div>
        
        <Badge variant="secondary" className="text-xs">
          {priceUpdateSource}
        </Badge>
        
        {lastUpdated && (
          <span>
            {lastUpdated.toLocaleTimeString()}.{lastUpdated.getMilliseconds().toString().padStart(3, '0')}
          </span>
        )}
      </div>
    </div>
  );
};

export const UltraFastLivePriceWidget = memo(UltraFastLivePriceWidgetComponent);
export default UltraFastLivePriceWidget;