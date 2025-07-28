import React, { memo } from 'react';
import { TrendingUp, TrendingDown, RefreshCw, Zap, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOptimizedPrice } from '@/hooks/useOptimizedPrice';
import { Badge } from '@/components/ui/badge';

interface UnifiedPriceWidgetProps {
  symbol: string;
  className?: string;
  showDetails?: boolean;
  compact?: boolean;
}

const SYMBOL_CONFIG = {
  'BTC/USD': { 
    displayName: 'Bitcoin', 
    icon: '₿', 
    tier: 1, 
    description: 'Real-time crypto pricing',
    color: 'text-orange-500'
  },
  'XAU/USD': { 
    displayName: 'Gold', 
    icon: '🥇', 
    tier: 1, 
    description: 'Live gold spot price',
    color: 'text-yellow-500'
  },
  'EUR/USD': { 
    displayName: 'Euro/Dollar', 
    icon: '€', 
    tier: 2, 
    description: 'Major forex pair',
    color: 'text-blue-500'
  }
};

const UnifiedPriceWidget: React.FC<UnifiedPriceWidgetProps> = memo(({ 
  symbol, 
  className = "",
  showDetails = true,
  compact = false
}) => {
  const { 
    price, 
    change, 
    changePercent, 
    isLoading, 
    error, 
    lastUpdated, 
    connectionStatus, 
    dataSource, 
    refreshPrice 
  } = useOptimizedPrice(symbol, {
    enableSmartPausing: true,
    debounceMs: 300
  });

  const symbolConfig = SYMBOL_CONFIG[symbol as keyof typeof SYMBOL_CONFIG];
  
  if (!symbolConfig) {
    return (
      <div className={`p-3 bg-muted/20 border border-dashed rounded-lg ${className}`}>
        <div className="text-sm text-muted-foreground text-center">
          Symbol {symbol} not supported in optimized pricing
        </div>
      </div>
    );
  }

  const formatPrice = (priceValue: number) => {
    if (symbol === 'XAU/USD') {
      return priceValue.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }
    
    return priceValue.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: symbol === 'BTC/USD' ? 0 : 4
    });
  };

  const formatChange = (changeValue: number, changePercentValue: number) => {
    const sign = changeValue >= 0 ? '+' : '';
    return `${sign}${changeValue.toFixed(2)} (${sign}${changePercentValue.toFixed(2)}%)`;
  };

  const getStatusIndicator = () => {
    switch (connectionStatus) {
      case 'connected':
        return (
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            {!compact && <Activity className="w-3 h-3 text-green-500" />}
          </div>
        );
      case 'connecting':
        return (
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
            {!compact && <RefreshCw className="w-3 h-3 text-yellow-500 animate-spin" />}
          </div>
        );
      case 'error':
        return <div className="w-2 h-2 bg-red-500 rounded-full" />;
      default:
        return <div className="w-2 h-2 bg-gray-500 rounded-full" />;
    }
  };

  const getTierBadge = () => {
    const tierConfig = {
      1: { label: 'Tier 1', variant: 'default' as const, icon: <Zap className="w-3 h-3" /> },
      2: { label: 'Tier 2', variant: 'secondary' as const, icon: <Activity className="w-3 h-3" /> }
    };
    
    const config = tierConfig[symbolConfig.tier as keyof typeof tierConfig];
    
    if (!config || compact) return null;
    
    return (
      <Badge variant={config.variant} className="text-xs">
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  if (error) {
    return (
      <div className={`flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-red-500 rounded-full" />
          <span className="text-sm text-red-700">
            {symbolConfig.displayName} Price Error
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={refreshPrice}
          className="text-red-600 hover:text-red-700"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  if (isLoading || !price) {
    return (
      <div className={`flex items-center justify-between p-3 bg-muted/50 border rounded-lg ${className}`}>
        <div className="flex items-center space-x-2">
          {getStatusIndicator()}
          <span className={`${symbolConfig.color}`}>{symbolConfig.icon}</span>
          <span className="text-sm text-muted-foreground">
            Loading {symbolConfig.displayName}...
          </span>
        </div>
        <div className="animate-spin">
          <RefreshCw className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>
    );
  }

  const isPositive = changePercent >= 0;

  if (compact) {
    return (
      <div className={`flex items-center justify-between p-2 bg-card border rounded-lg ${className}`}>
        <div className="flex items-center space-x-2">
          {getStatusIndicator()}
          <span className={`text-lg ${symbolConfig.color}`}>{symbolConfig.icon}</span>
          <div>
            <div className="text-sm font-bold">{formatPrice(price)}</div>
            <div className={`text-xs ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={refreshPrice}
          className="p-1"
        >
          <RefreshCw className="w-3 h-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className={`p-4 bg-card border rounded-lg space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {getStatusIndicator()}
          <span className={`text-lg ${symbolConfig.color}`}>{symbolConfig.icon}</span>
          <span className="text-sm font-medium text-foreground">
            {symbolConfig.displayName}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          {getTierBadge()}
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshPrice}
            className="text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* Price Data */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="text-xl font-bold text-foreground">
            {formatPrice(price)}
          </div>
          <div className={`flex items-center space-x-1 text-sm ${
            isPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            {isPositive ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span>{formatChange(change, changePercent)}</span>
          </div>
        </div>
      </div>
      
      {/* Details */}
      {showDetails && (
        <div className="flex justify-between items-center text-xs text-muted-foreground border-t pt-2">
          <div className="space-y-1">
            <div>Source: {dataSource}</div>
            {lastUpdated && (
              <div>Updated: {lastUpdated.toLocaleTimeString()}</div>
            )}
          </div>
          <div className="text-right">
            <div className="text-xs">{symbolConfig.description}</div>
            <div className="text-xs">Tier {symbolConfig.tier} Optimization</div>
          </div>
        </div>
      )}
    </div>
  );
});

UnifiedPriceWidget.displayName = 'UnifiedPriceWidget';

export default UnifiedPriceWidget;