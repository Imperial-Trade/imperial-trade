import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useWebSocketLivePrice } from '@/hooks/useWebSocketLivePrice';
import { ArrowUp, ArrowDown, Zap, Clock } from 'lucide-react';

interface LivePriceWidgetProps {
  symbol: string;
  label?: string;
  showChange?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function LivePriceWidget({ 
  symbol, 
  label, 
  showChange = true, 
  size = 'md' 
}: LivePriceWidgetProps) {
  const { 
    price, 
    change, 
    changePercent, 
    isLoading, 
    error, 
    lastUpdated, 
    connectionStatus 
  } = useWebSocketLivePrice(symbol);

  const [priceAge, setPriceAge] = useState<number>(0);

  // Update price age every second
  useEffect(() => {
    if (!lastUpdated) return;
    
    const interval = setInterval(() => {
      const age = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
      setPriceAge(age);
    }, 1000);

    return () => clearInterval(interval);
  }, [lastUpdated]);

  const isPositive = change >= 0;
  const isStale = priceAge > 30; // Consider price stale after 30 seconds
  const isVeryStale = priceAge > 60; // Very stale after 1 minute

  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl'
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      case 'disconnected': return 'bg-red-500';
      case 'error': return 'bg-red-600';
      default: return 'bg-gray-500';
    }
  };

  const getPriceAgeColor = () => {
    if (isVeryStale) return 'text-red-500';
    if (isStale) return 'text-yellow-500';
    return 'text-green-500';
  };

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="p-4">
          <div className="text-red-600 text-sm">
            ❌ Price Error: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span>{label || symbol}</span>
          <div className="flex items-center gap-2">
            {/* **PHASE 6: PRICE SOURCE STATUS INDICATORS** */}
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${getConnectionStatusColor()}`} />
              <span className="text-xs text-muted-foreground capitalize">
                {connectionStatus}
              </span>
            </div>
            
            {/* **PHASE 5: PRICE FRESHNESS INDICATORS** */}
            {lastUpdated && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span className={`text-xs ${getPriceAgeColor()}`}>
                  {priceAge}s
                </span>
              </div>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="space-y-2">
          {/* **PHASE 2: EXECUTION PRICE DISPLAY** */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`font-mono font-bold ${sizeClasses[size]}`}>
                {isLoading ? (
                  <span className="animate-pulse">---.--</span>
                ) : (
                  `$${price.toFixed(price > 100 ? 2 : 5)}`
                )}
              </span>
              
              {/* Real-time indicator */}
              {connectionStatus === 'connected' && !isStale && (
                <Zap className="w-4 h-4 text-green-500 animate-pulse" />
              )}
            </div>
          </div>

          {/* Price change and freshness info */}
          {showChange && !isLoading && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isPositive ? (
                  <ArrowUp className="w-4 h-4 text-green-500" />
                ) : (
                  <ArrowDown className="w-4 h-4 text-red-500" />
                )}
                <span className={`text-sm font-medium ${
                  isPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {isPositive ? '+' : ''}{change.toFixed(price > 100 ? 2 : 5)} 
                  ({isPositive ? '+' : ''}{changePercent.toFixed(2)}%)
                </span>
              </div>
              
              {/* **PHASE 6: EXECUTION VS DISPLAY PRICE INDICATOR** */}
              <Badge variant="secondary" className="text-xs">
                Execution Price: MID
              </Badge>
            </div>
          )}

          {/* Price age warning */}
          {isStale && (
            <div className={`text-xs p-2 rounded ${
              isVeryStale 
                ? 'bg-red-50 text-red-700 border border-red-200' 
                : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
            }`}>
              ⚠️ Price data is {priceAge}s old {isVeryStale ? '(Very Stale)' : '(Stale)'}
            </div>
          )}

          {/* Real-time source indicator */}
          <div className="text-xs text-muted-foreground">
            Source: WebSocket • {symbol} • Last: {
              lastUpdated ? lastUpdated.toLocaleTimeString() : 'Never'
            }
          </div>
        </div>
      </CardContent>
    </Card>
  );
}