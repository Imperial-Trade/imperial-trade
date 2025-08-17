import React, { useRef, useEffect, memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, AlertCircle, Wifi, Loader2, Zap, RefreshCw, WifiOff, Activity } from 'lucide-react';
import { useZeroLatencyPriceEngine } from '@/hooks/useZeroLatencyPriceEngine';

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
  onTakeProfitHit?: (level: number) => void;
  onStopLossHit?: () => void;
  onOrderActivation?: () => void;
}

const ZeroLatencyLivePriceWidgetComponent = ({
  alert,
  onTakeProfitHit,
  onStopLossHit,
  onOrderActivation
}: ZeroLatencyLivePriceWidgetProps) => {
  // Zero-latency price engine with all optimizations enabled
  const {
    price: currentPrice,
    change,
    changePercent,
    bid,
    ask,
    timestamp,
    renderLatency,
    frameRate,
    isDirectRendered,
    workerCalculated,
    registerElement,
    unregisterElement,
    forceUpdate,
    getPerformanceMetrics
  } = useZeroLatencyPriceEngine(alert.tradermade_symbol, {
    enableDirectDOM: true,
    enableWebWorker: true,
    enableSharedMemory: true,
    targetFPS: 60,
    priceDecimalPlaces: 5,
    animationDuration: 150
  });

  // Direct DOM element references
  const priceRef = useRef<HTMLSpanElement>(null);
  const changeRef = useRef<HTMLSpanElement>(null);
  const bidRef = useRef<HTMLSpanElement>(null);
  const askRef = useRef<HTMLSpanElement>(null);
  const performanceRef = useRef<HTMLDivElement>(null);

  // Register DOM elements for direct manipulation
  useEffect(() => {
    if (priceRef.current) {
      registerElement(priceRef.current, 'price');
    }
    if (changeRef.current) {
      registerElement(changeRef.current, 'change');
    }
    if (bidRef.current) {
      registerElement(bidRef.current, 'bid');
    }
    if (askRef.current) {
      registerElement(askRef.current, 'ask');
    }

    return () => {
      if (priceRef.current) unregisterElement(priceRef.current);
      if (changeRef.current) unregisterElement(changeRef.current);
      if (bidRef.current) unregisterElement(bidRef.current);
      if (askRef.current) unregisterElement(askRef.current);
    };
  }, [registerElement, unregisterElement]);

  // Performance monitoring
  useEffect(() => {
    const interval = setInterval(() => {
      if (performanceRef.current && isDirectRendered) {
        const metrics = getPerformanceMetrics();
        performanceRef.current.textContent = 
          `${renderLatency.toFixed(1)}μs | ${frameRate.toFixed(0)}fps | ${metrics.elementsRegistered} elements`;
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [getPerformanceMetrics, renderLatency, frameRate, isDirectRendered]);

  // Order logic checks (unchanged from original but optimized)
  useEffect(() => {
    if (!currentPrice) return;

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
  }, [currentPrice, alert, onTakeProfitHit, onStopLossHit, onOrderActivation]);

  if (!currentPrice) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Initializing zero-latency engine...</span>
      </div>
    );
  }

  const changeColor = change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-muted-foreground';
  const spread = ask - bid;

  return (
    <div className="space-y-3">
      {/* Zero-Latency Price Display with Direct DOM Manipulation */}
      <div className="relative">
        <div className="flex items-center gap-4 p-4 rounded-lg bg-gradient-to-r from-background to-muted/20 border">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              {alert.tradermade_symbol}
            </span>
            <Badge variant={isDirectRendered ? "default" : "secondary"} className="text-xs">
              {isDirectRendered ? 'Direct DOM' : 'React'}
            </Badge>
            {workerCalculated && (
              <Badge variant="outline" className="text-xs">
                <Activity className="h-3 w-3 mr-1" />
                Worker
              </Badge>
            )}
          </div>
          
          {/* Main Price - Direct DOM Updated */}
          <div className="flex items-center gap-3">
            <span 
              ref={priceRef}
              className="text-2xl font-bold tabular-nums transition-all duration-150"
              style={{ minWidth: '120px' }}
            >
              {currentPrice.toFixed(5)}
            </span>
            
            <div className="flex items-center gap-1">
              {change > 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : change < 0 ? (
                <TrendingDown className="h-4 w-4 text-red-600" />
              ) : null}
              <span 
                ref={changeRef}
                className={`text-sm font-medium ${changeColor} tabular-nums`}
              >
                {change > 0 ? '+' : ''}{changePercent.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        {/* Bid/Ask Display - Direct DOM Updated */}
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
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
      </div>

      {/* Zero-Latency Performance Metrics */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
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

        <div 
          ref={performanceRef}
          className="font-mono text-xs opacity-60"
        />
        
        <Button 
          size="sm" 
          variant="ghost" 
          onClick={forceUpdate}
          className="h-6 px-2 text-xs"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>

      {/* Status Indicators */}
      <div className="flex items-center gap-2 text-xs">
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
    </div>
  );
};

export const ZeroLatencyLivePriceWidget = memo(ZeroLatencyLivePriceWidgetComponent);
export default ZeroLatencyLivePriceWidget;
