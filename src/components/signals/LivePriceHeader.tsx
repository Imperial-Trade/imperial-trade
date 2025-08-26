
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Clock } from 'lucide-react';
import { useWebSocketPrices } from '@/contexts/WebSocketPriceContext';
import { formatPrice } from '@/utils/priceUtils';

interface LivePriceHeaderProps {
  symbol: string;
  tradermadeSymbol?: string;
}

export const LivePriceHeader: React.FC<LivePriceHeaderProps> = ({ 
  symbol, 
  tradermadeSymbol 
}) => {
  const { prices, connectionStatus, lastUpdated } = useWebSocketPrices();
  
  const displaySymbol = tradermadeSymbol || symbol;
  const priceData = prices[displaySymbol];
  const currentPrice = priceData?.price || 0;
  const change = priceData?.change || 0;
  const changePercent = priceData?.changePercent || 0;
  
  const isPositive = change >= 0;
  const isConnected = connectionStatus === 'connected';
  
  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
            Live Price for {symbol}
          </h3>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            <Badge variant={isConnected ? "default" : "destructive"} className="text-xs">
              {connectionStatus}
            </Badge>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              ${formatPrice(currentPrice)}
            </div>
            <div className={`flex items-center gap-1 ${
              isPositive ? 'text-green-600' : 'text-red-600'
            }`}>
              <span className="font-medium">
                {isPositive ? '+' : ''}{change.toFixed(4)}
              </span>
              <span className="text-sm">
                ({isPositive ? '+' : ''}{changePercent.toFixed(2)}%)
              </span>
            </div>
          </div>
          
          {lastUpdated && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>
                {new Date(lastUpdated).toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
