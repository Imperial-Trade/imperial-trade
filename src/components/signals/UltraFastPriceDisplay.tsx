/**
 * ULTRA-FAST PRICE DISPLAY
 * Zero-latency price rendering with intelligent caching
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { useOptimizedWebSocketPrices } from '@/contexts/OptimizedWebSocketPriceContext';
import { getSymbolStreamingPolicy, getUnifiedMarketStatus } from '@/utils/unifiedMarketHours';
import { TrendingUp, TrendingDown, Activity, Zap, Clock } from 'lucide-react';

interface UltraFastPriceDisplayProps {
  symbol: string;
  showDiagnostics?: boolean;
  className?: string;
}

interface PriceAnimation {
  isAnimating: boolean;
  direction: 'up' | 'down' | 'none';
  intensity: number; // 0-100 for animation strength
}

export function UltraFastPriceDisplay({ 
  symbol, 
  showDiagnostics = false, 
  className = '' 
}: UltraFastPriceDisplayProps) {
  const { prices, connectionStatus, subscribe, getPrice } = useOptimizedWebSocketPrices();
  const [animation, setAnimation] = useState<PriceAnimation>({ 
    isAnimating: false, 
    direction: 'none', 
    intensity: 0 
  });
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [updateCount, setUpdateCount] = useState(0);
  const [latency, setLatency] = useState<number | null>(null);
  const animationRef = useRef<NodeJS.Timeout>();
  const lastUpdateRef = useRef<number>(Date.now());

  // Subscribe to symbol on mount
  useEffect(() => {
    if (symbol) {
      console.log(`⚡ UltraFastPriceDisplay: Subscribing to ${symbol}`);
      subscribe([symbol]);
    }
  }, [symbol, subscribe]);

  // Handle price updates with ultra-fast animation
  const currentPriceData = getPrice(symbol);
  const currentPrice = currentPriceData?.price;

  useEffect(() => {
    if (currentPrice !== undefined && currentPrice !== lastPrice) {
      const now = Date.now();
      const timeSinceLastUpdate = now - lastUpdateRef.current;
      
      // Calculate latency and update metrics
      setLatency(timeSinceLastUpdate);
      setUpdateCount(prev => prev + 1);
      lastUpdateRef.current = now;

      // Determine animation direction and intensity
      if (lastPrice !== null) {
        const priceDiff = currentPrice - lastPrice;
        const direction = priceDiff > 0 ? 'up' : priceDiff < 0 ? 'down' : 'none';
        const intensity = Math.min(Math.abs(priceDiff) * 1000, 100); // Scale intensity

        setAnimation({ isAnimating: true, direction, intensity });

        // Clear animation after brief period
        if (animationRef.current) clearTimeout(animationRef.current);
        animationRef.current = setTimeout(() => {
          setAnimation(prev => ({ ...prev, isAnimating: false }));
        }, 200);
      }

      setLastPrice(currentPrice);
    }
  }, [currentPrice, lastPrice]);

  // Get symbol streaming info
  const streamingPolicy = getSymbolStreamingPolicy(symbol);
  const marketStatus = getUnifiedMarketStatus(symbol);

  // Format price display
  const formatPrice = (price: number) => {
    if (symbol.includes('BTC') || symbol.includes('XAU')) {
      return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return price.toFixed(5);
  };

  // Get animation classes
  const getAnimationClasses = () => {
    if (!animation.isAnimating) return '';
    
    const baseClasses = 'transition-all duration-200';
    const colorClasses = animation.direction === 'up' 
      ? 'text-green-500 bg-green-500/10' 
      : animation.direction === 'down' 
      ? 'text-red-500 bg-red-500/10'
      : '';
    
    return `${baseClasses} ${colorClasses}`;
  };

  // Get trend icon
  const TrendIcon = animation.direction === 'up' ? TrendingUp 
                  : animation.direction === 'down' ? TrendingDown 
                  : Activity;

  return (
    <div className={`p-4 border rounded-lg bg-card ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">{symbol}</h3>
          <Badge variant={streamingPolicy.allowStreaming ? 'default' : 'secondary'} className="text-xs">
            {marketStatus.marketType}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <TrendIcon className={`w-4 h-4 ${getAnimationClasses()}`} />
          <Badge variant="outline" className="text-xs">
            {connectionStatus}
          </Badge>
        </div>
      </div>

      {/* Price Display */}
      <div className={`text-3xl font-bold mb-2 p-2 rounded ${getAnimationClasses()}`}>
        {currentPrice ? formatPrice(currentPrice) : '---'}
      </div>

      {/* Change Display */}
      {currentPriceData?.change !== undefined && (
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-sm font-medium ${
            currentPriceData.change > 0 ? 'text-green-500' : 
            currentPriceData.change < 0 ? 'text-red-500' : 
            'text-muted-foreground'
          }`}>
            {currentPriceData.change > 0 ? '+' : ''}{currentPriceData.change.toFixed(5)}
          </span>
          <span className={`text-sm ${
            currentPriceData.changePercent > 0 ? 'text-green-500' : 
            currentPriceData.changePercent < 0 ? 'text-red-500' : 
            'text-muted-foreground'
          }`}>
            ({currentPriceData.changePercent > 0 ? '+' : ''}{currentPriceData.changePercent.toFixed(2)}%)
          </span>
        </div>
      )}

      {/* Streaming Status */}
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Stream Status:</span>
          <Badge variant={streamingPolicy.allowStreaming ? 'default' : 'destructive'} className="text-xs">
            {streamingPolicy.allowStreaming ? 'Live' : 'Blocked'}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Market Session:</span>
          <span className="text-xs">{marketStatus.session || 'Unknown'}</span>
        </div>

        {!streamingPolicy.allowStreaming && (
          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            {streamingPolicy.reason}
          </div>
        )}
      </div>

      {/* Ultra-Fast Diagnostics */}
      {showDiagnostics && (
        <div className="mt-4 pt-3 border-t space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <Zap className="w-3 h-3 text-yellow-500" />
            <span className="text-muted-foreground">Ultra-Fast Metrics</span>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Updates:</span>
              <span className="ml-1 font-medium">{updateCount}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Latency:</span>
              <span className="ml-1 font-medium">{latency ? `${latency}ms` : '---'}</span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs">
            <Clock className="w-3 h-3 text-blue-500" />
            <span className="text-muted-foreground">
              Last: {currentPriceData?.timestamp ? new Date(currentPriceData.timestamp).toLocaleTimeString() : '---'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}