import React, { useRef, useEffect } from 'react';
import { useUltraFastLivePrice } from '@/hooks/useUltraFastLivePrice';
import { cn } from '@/lib/utils';

interface UltraFastPriceDisplayProps {
  symbol: string;
  className?: string;
  showChange?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Ultra-fast price display with RAF-based updates and CSS transforms
 * Optimized for sub-100ms price updates with smooth 60fps animations
 */
export function UltraFastPriceDisplay({ 
  symbol, 
  className, 
  showChange = true, 
  size = 'md' 
}: UltraFastPriceDisplayProps) {
  const priceData = useUltraFastLivePrice(symbol);
  const priceRef = useRef<HTMLSpanElement>(null);
  const changeRef = useRef<HTMLSpanElement>(null);
  const prevPriceRef = useRef(priceData.price);

  // Use requestAnimationFrame for smooth price animations
  useEffect(() => {
    if (priceRef.current && priceData.price !== prevPriceRef.current) {
      const element = priceRef.current;
      const isIncrease = priceData.price > prevPriceRef.current;
      
      // Use CSS transforms for hardware acceleration
      element.style.transform = 'scale(1.05)';
      element.style.color = isIncrease ? 'hsl(var(--success))' : 'hsl(var(--destructive))';
      
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          element.style.transform = 'scale(1)';
          element.style.color = '';
        });
      });
      
      prevPriceRef.current = priceData.price;
    }
  }, [priceData.price]);

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg font-semibold'
  };

  const formatPrice = (price: number) => {
    if (price === 0) return '0.00';
    if (price > 1000) return price.toFixed(2);
    if (price > 1) return price.toFixed(4);
    return price.toFixed(6);
  };

  const formatChange = (change: number, changePercent: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)} (${sign}${changePercent.toFixed(2)}%)`;
  };

  if (priceData.isLoading) {
    return (
      <div className={cn('animate-pulse', className)}>
        <div className="h-4 bg-muted rounded w-20"></div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col', className)}>
      <span 
        ref={priceRef}
        className={cn(
          'font-mono transition-all duration-150 ease-out',
          sizeClasses[size]
        )}
      >
        ${formatPrice(priceData.price)}
      </span>
      
      {showChange && (
        <span 
          ref={changeRef}
          className={cn(
            'text-xs font-mono transition-colors duration-150',
            priceData.change >= 0 ? 'text-success' : 'text-destructive'
          )}
        >
          {formatChange(priceData.change, priceData.changePercent)}
        </span>
      )}
      
      {priceData.isUltraFastTick && (
        <span className="text-xs text-primary font-medium">
          ⚡ Ultra-Fast Tick
        </span>
      )}
      
      {priceData.error && (
        <span className="text-xs text-destructive">
          Error: {priceData.error}
        </span>
      )}
    </div>
  );
}