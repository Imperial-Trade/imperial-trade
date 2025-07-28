import React, { memo } from 'react';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGoldPrice } from '@/contexts/GoldPriceContext';

interface GoldLivePriceWidgetProps {
  symbol: string;
  className?: string;
}

const GoldLivePriceWidget: React.FC<GoldLivePriceWidgetProps> = memo(({ 
  symbol, 
  className = "" 
}) => {
  const { price, connectionStatus, dataSource, lastUpdated, error, refreshPrice } = useGoldPrice();

  // Only show widget for gold symbols
  const isGoldSymbol = ['GOLD', 'XAU/USD', 'XAUUSD'].includes(symbol);
  
  if (!isGoldSymbol) {
    return null;
  }

  const formatPrice = (priceValue: number) => {
    return priceValue.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const formatChange = (change: number, changePercent: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)} (${sign}${changePercent.toFixed(2)}%)`;
  };

  const getStatusDot = () => {
    switch (connectionStatus) {
      case 'connected':
        return <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />;
      case 'connecting':
        return <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />;
      case 'error':
        return <div className="w-2 h-2 bg-red-500 rounded-full" />;
      default:
        return <div className="w-2 h-2 bg-gray-500 rounded-full" />;
    }
  };

  const getDataSourceBadge = () => {
    if (dataSource === 'unavailable') {
      return (
        <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-md">
          Unavailable
        </span>
      );
    }
    return (
      <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-md">
        Live Gold Feed
      </span>
    );
  };

  if (error) {
    return (
      <div className={`flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-red-500 rounded-full" />
          <span className="text-sm text-red-700">Gold Price Error</span>
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

  if (!price) {
    return (
      <div className={`flex items-center justify-between p-3 bg-muted/50 border rounded-lg ${className}`}>
        <div className="flex items-center space-x-2">
          {getStatusDot()}
          <span className="text-sm text-muted-foreground">Loading gold price...</span>
        </div>
        <div className="animate-spin">
          <RefreshCw className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>
    );
  }

  const isPositive = price.changePercent >= 0;

  return (
    <div className={`p-3 bg-card border rounded-lg space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {getStatusDot()}
          <span className="text-sm font-medium text-foreground">Gold Live Price</span>
        </div>
        <div className="flex items-center space-x-2">
          {getDataSourceBadge()}
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
      
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="text-lg font-bold text-foreground">
            {formatPrice(price.price)}
          </div>
          <div className={`flex items-center space-x-1 text-sm ${
            isPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            {isPositive ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span>{formatChange(price.change, price.changePercent)}</span>
          </div>
        </div>
      </div>
      
      {lastUpdated && (
        <div className="text-xs text-muted-foreground">
          Updated: {lastUpdated.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
});

GoldLivePriceWidget.displayName = 'GoldLivePriceWidget';

export default GoldLivePriceWidget;