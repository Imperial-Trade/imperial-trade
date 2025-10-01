import React, { useState, useEffect } from 'react';
import { useEnhancedLivePrice } from '@/hooks/useLivePrice';
import { useConnectionStability } from '@/hooks/useConnectionStability';
import { cn } from '@/lib/utils';
import { Wifi, WifiOff } from 'lucide-react';

interface ZeroPausePriceDisplayProps {
  symbol: string;
  className?: string;
  showChange?: boolean;
  showTimestamp?: boolean;
  precision?: number;
}

export const ZeroPausePriceDisplay: React.FC<ZeroPausePriceDisplayProps> = ({
  symbol,
  className,
  showChange = true,
  showTimestamp = false,
  precision = 2
}) => {
  const { price, connectionQuality } = useEnhancedLivePrice(symbol);
  const { shouldAllowQualityChange } = useConnectionStability();
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [displayPrice, setDisplayPrice] = useState<number | null>(null);
  const [stableQuality, setStableQuality] = useState(connectionQuality);

  // ✅ FLICKER ELIMINATION: Stability-aware quality changes
  useEffect(() => {
    if (shouldAllowQualityChange(symbol, stableQuality as any, connectionQuality as any)) {
      setStableQuality(connectionQuality);
    }
  }, [connectionQuality, shouldAllowQualityChange, symbol, stableQuality]);

  // Update last price when we receive a valid price (no flicker fallback)
  useEffect(() => {
    if (price && price > 0) {
      setLastPrice(price);
      setDisplayPrice(price);
    }
  }, [price]);

  // Initialize display price from last known price if current price is invalid
  useEffect(() => {
    if ((!price || price <= 0) && lastPrice && !displayPrice) {
      setDisplayPrice(lastPrice);
    }
  }, [price, lastPrice, displayPrice]);

  const formatPrice = (value: number | null) => {
    if (!value) return '---';
    if (symbol === 'XAUUSD') {
      return value.toFixed(2);
    } else if (symbol === 'BTCUSD') {
      return value.toFixed(0);
    }
    return value.toFixed(precision);
  };

  const getStatusIndicator = () => {
    switch (stableQuality) {
      case 'live':
        return {
          icon: Wifi,
          className: 'text-green-500',
          bgClassName: 'bg-green-500',
          title: 'Live updates active'
        };
      case 'hydrated':
        return {
          icon: Wifi,
          className: 'text-yellow-500',
          bgClassName: 'bg-yellow-500',
          title: 'Loading live updates...'
        };
      case 'stale':
        return {
          icon: WifiOff,
          className: 'text-red-500',
          bgClassName: 'bg-red-500',
          title: 'Connection issues'
        };
      default:
        return {
          icon: WifiOff,
          className: 'text-muted-foreground',
          bgClassName: 'bg-muted',
          title: 'No data'
        };
    }
  };

  const indicator = getStatusIndicator();

  return (
    <div className={cn('flex flex-col space-y-1', className)}>
      {/* Main Price */}
      <div className="flex items-center gap-2">
        <span className={cn(
          'text-2xl font-bold',
          displayPrice ? 'text-accent-green' : 'text-muted-foreground'
        )}
        style={{ willChange: 'transform' }}>
          {formatPrice(displayPrice)}
        </span>
        
        {/* Enhanced Status Indicator */}
        <div className="flex items-center gap-1">
          <indicator.icon className={cn('w-3 h-3', indicator.className)} />
          <div 
            className={cn('w-2 h-2 rounded-full', indicator.bgClassName.replace('animate-pulse', ''))}
            title={indicator.title}
            style={{ willChange: 'transform' }}
          />
        </div>
      </div>

      {/* Timestamp */}
      {showTimestamp && displayPrice && (
        <span className="text-xs text-muted-foreground">
          {new Date().toLocaleTimeString()}
        </span>
      )}
    </div>
  );
};