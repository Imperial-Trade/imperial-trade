import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOptimizedWebSocketPrices } from '@/contexts/OptimizedWebSocketPriceContext';
import { Activity, Wifi, Database } from 'lucide-react';

/**
 * Simple status display to show live data connection and active symbols
 */
export const LiveDataStatus: React.FC = () => {
  const { 
    prices, 
    connectionStatus, 
    dataSource,
    lastUpdated,
    isConnected 
  } = useOptimizedWebSocketPrices();

  const activeSymbolsCount = Object.keys(prices).length;
  const hasRecentData = lastUpdated && (Date.now() - lastUpdated.getTime()) < 10000; // Within 10 seconds

  const getStatusBadge = () => {
    if (isConnected && hasRecentData) {
      return (
        <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
          <Wifi className="w-3 h-3 mr-1" />
          Live Data
        </Badge>
      );
    }
    
    if (isConnected) {
      return (
        <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
          <Activity className="w-3 h-3 mr-1" />
          Connected
        </Badge>
      );
    }
    
    return (
      <Badge className="bg-red-500/20 text-red-300 border-red-500/30">
        <Database className="w-3 h-3 mr-1" />
        Offline
      </Badge>
    );
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Live Data Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Connection:</span>
            {getStatusBadge()}
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Active Symbols:</span>
            <Badge variant="outline">
              {activeSymbolsCount}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Data Source:</span>
            <Badge variant="secondary" className="text-xs">
              {dataSource}
            </Badge>
          </div>
          
          {lastUpdated && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Last Update:</span>
              <span className="text-xs text-muted-foreground">
                {lastUpdated.toLocaleTimeString()}
              </span>
            </div>
          )}
          
          {activeSymbolsCount > 0 && (
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground">Current Prices:</span>
              <div className="grid grid-cols-1 gap-1">
                {Object.entries(prices).slice(0, 3).map(([symbol, priceData]) => (
                  <div key={symbol} className="flex items-center justify-between text-xs">
                    <span className="font-mono text-muted-foreground">{symbol}:</span>
                    <span className="font-mono">{priceData.price.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default LiveDataStatus;