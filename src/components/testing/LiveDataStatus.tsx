import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOptimizedWebSocketPrices } from '@/contexts/OptimizedWebSocketPriceContext';
import { Activity, Wifi, Database } from 'lucide-react';

/**
 * Simple status display to show live data connection and active symbols
 */
export default function LiveDataStatus() {
  const { 
    connectionStatus, 
    prices, 
    dataSource, 
    lastUpdated,
    getActiveSymbolsCount,
    getActiveSymbols,
    getStats
  } = useOptimizedWebSocketPrices();

  const stats = getStats?.() || { messagesReceived: 0, reconnections: 0, avgLatency: 0, activeSymbols: 0, connectionStatus: 'disconnected' };
  const activeSymbolsCount = getActiveSymbolsCount();
  const activeSymbols = getActiveSymbols();

  const getStatusBadge = () => {
    const isConnected = connectionStatus === 'connected';
    const hasRecentData = lastUpdated && (Date.now() - lastUpdated.getTime()) < 30000; // 30 seconds

    if (isConnected && hasRecentData) {
      return <Badge variant="default">Live Data</Badge>;
    } else if (isConnected) {
      return <Badge variant="secondary">Connected</Badge>;
    } else {
      return <Badge variant="destructive">Offline</Badge>;
    }
  };

  const activePricesCount = Object.keys(prices || {}).length;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Live Data Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Status</span>
            {getStatusBadge()}
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Active Symbols</span>
            <span className="text-sm font-medium">{activeSymbolsCount} subscribed</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Live Prices</span>
            <span className="text-sm font-medium">{activePricesCount} received</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Data Source</span>
            <span className="text-xs font-mono">{dataSource}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Last Update</span>
            <span className="text-xs">{lastUpdated ? lastUpdated.toLocaleTimeString() : 'Never'}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Messages</span>
            <span className="text-xs font-mono">{stats.messagesReceived || 0}</span>
          </div>
          
          {activeSymbolsCount > 0 && (
            <div className="mt-4 pt-3 border-t">
              <div className="text-xs text-muted-foreground mb-2">Subscribed: {activeSymbols.join(', ')}</div>
            </div>
          )}

          {activePricesCount > 0 && (
            <div className="mt-4 pt-3 border-t">
              <div className="text-xs text-muted-foreground mb-2">Current Prices:</div>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {Object.entries(prices || {}).slice(0, 3).map(([symbol, data]) => (
                  <div key={symbol} className="flex justify-between text-xs">
                    <span>{symbol}</span>
                    <span className="font-mono">{data.price?.toFixed(4)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}