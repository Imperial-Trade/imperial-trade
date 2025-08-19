import React, { memo } from 'react';
import { useOptimizedLivePrice } from '@/hooks/useOptimizedLivePrice';

interface LivePriceDisplayProps {
  symbol: string;
  className?: string;
}

const LivePriceDisplay: React.FC<LivePriceDisplayProps> = ({ symbol, className = '' }) => {
  const { price, connectionStatus, lastUpdated } = useOptimizedLivePrice(symbol, {
    debounceMs: 100, // Fast updates for display
    enableSmartPausing: false
  });

  // Format price based on symbol type
  const formatPrice = (price: number): string => {
    if (price === 0) return '---.--';
    
    // Different decimal places based on symbol
    if (symbol.includes('JPY')) {
      return price.toFixed(3);
    } else if (symbol.includes('XAU') || symbol.includes('GOLD')) {
      return price.toFixed(2);
    } else if (symbol.includes('BTC') || symbol.includes('ETH')) {
      return price.toFixed(2);
    } else {
      return price.toFixed(5);
    }
  };

  // Connection status styling
  const getStatusClass = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'text-accent-green';
      case 'connecting':
        return 'text-accent-gold animate-pulse';
      case 'error':
      case 'disconnected':
        return 'text-accent-red';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <span 
      className={`font-mono font-semibold transition-colors duration-200 ${getStatusClass()} ${className}`}
      title={lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString()}` : 'No data'}
    >
      ${formatPrice(price)}
    </span>
  );
};

export default memo(LivePriceDisplay, (prevProps, nextProps) => {
  // Only re-render if symbol changes
  return prevProps.symbol === nextProps.symbol && prevProps.className === nextProps.className;
});