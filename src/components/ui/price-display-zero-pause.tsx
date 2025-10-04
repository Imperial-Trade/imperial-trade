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
  const [pulseKey, setPulseKey] = useState(0);
  const [priceChangeDirection, setPriceChangeDirection] = useState<'up' | 'down' | null>(null);

  // ✅ FLICKER ELIMINATION: Stability-aware quality changes
  useEffect(() => {
    if (shouldAllowQualityChange(symbol, stableQuality, connectionQuality)) {
      setStableQuality(connectionQuality);
    }
  }, [connectionQuality, shouldAllowQualityChange, symbol, stableQuality]);

  // 🚀 PHASE 4: Update price with pulse animation + direction indicator
  useEffect(() => {
    if (price && price > 0) {
      // Detect price change direction for micro-changes
      if (displayPrice && price !== displayPrice) {
        setPriceChangeDirection(price > displayPrice ? 'up' : 'down');
        setPulseKey(prev => prev + 1);
        
        // Clear direction after animation
        setTimeout(() => setPriceChangeDirection(null), 500);
      }
      
      setLastPrice(price);
      setDisplayPrice(price);
    }
  }, [price, displayPrice]);

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

  // 🚀 PHASE 4: Enhanced status indicators with data source labels
  const getStatusIndicator = () => {
    switch (stableQuality) {
      case 'live':
        return {
          icon: Wifi,
          className: 'text-green-500',
          bgClassName: 'bg-green-500',
          title: '🟢 Live (2s polling)',
          label: 'Live',
          pulse: true
        };
      case 'hydrated':
        return {
          icon: Wifi,
          className: 'text-yellow-500',
          bgClassName: 'bg-yellow-500',
          title: '🟡 Hydrated (loading...)',
          label: 'Hydrated',
          pulse: true
        };
      case 'stale':
        return {
          icon: WifiOff,
          className: 'text-red-500',
          bgClassName: 'bg-red-500',
          title: '🔴 Stale (>10s)',
          label: 'Stale',
          pulse: false
        };
      default:
        return {
          icon: WifiOff,
          className: 'text-muted-foreground',
          bgClassName: 'bg-muted',
          title: 'No data',
          label: 'Offline',
          pulse: false
        };
    }
  };

  const indicator = getStatusIndicator();

  return (
    <div className={cn('flex flex-col space-y-1', className)}>
      {/* Main Price with Pulse Animation */}
      <div className="flex items-center gap-2">
        <span 
          key={pulseKey}
          className={cn(
            'text-2xl font-bold transition-all duration-300',
            displayPrice ? 'text-accent-green' : 'text-muted-foreground',
            priceChangeDirection === 'up' && 'animate-pulse text-green-400',
            priceChangeDirection === 'down' && 'animate-pulse text-red-400'
          )}
          style={{ willChange: 'transform' }}
        >
          {formatPrice(displayPrice)}
        </span>
        
        {/* 🚀 PHASE 4: Enhanced Status Indicator with Labels */}
        <div className="flex items-center gap-1.5">
          <indicator.icon className={cn('w-3.5 h-3.5', indicator.className, indicator.pulse ? 'animate-pulse' : '')} />
          <div 
            className={cn(
              'w-2 h-2 rounded-full transition-all duration-300',
              indicator.bgClassName,
              indicator.pulse ? 'animate-pulse' : ''
            )}
            title={indicator.title}
            style={{ willChange: 'transform' }}
          />
          <span className={cn('text-[10px] font-medium uppercase tracking-wide', indicator.className)}>
            {indicator.label}
          </span>
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