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
    // 🚨 PHASE 3: Enhanced connection status hierarchy  
    const hasRecentData = lastUpdated && (Date.now() - lastUpdated.getTime()) < 30000; // 30s threshold
    const activePricesCount = Object.keys(prices || {}).length;
    
    if (connectionStatus === 'connected' && hasRecentData) {
      return <Badge variant="default" className="text-green-600">Live Data</Badge>;
    } else if (connectionStatus === 'connected') {
      return <Badge variant="secondary" className="text-blue-600">Connected</Badge>;
    } else if (activePricesCount > 0) {
      return <Badge variant="outline" className="text-yellow-600">Database Backup</Badge>;
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
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{activeSymbolsCount} subscribed</span>
              {activeSymbolsCount > 0 && (
                <div className="flex gap-1">
                  {getActiveSymbols().slice(0, 3).map(symbol => (
                    <Badge key={symbol} variant="outline" className="text-xs px-1 py-0">
                      {symbol}
                    </Badge>
                  ))}
                  {getActiveSymbols().length > 3 && (
                    <span className="text-xs text-muted-foreground">+{getActiveSymbols().length - 3}</span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Live Prices</span>
            <span className="text-sm font-medium">{activePricesCount} received</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Data Source</span>
            <div className="flex items-center gap-2">
              {connectionStatus === 'connected' ? <Wifi className="w-3 h-3 text-green-600" /> : 
               Object.keys(prices || {}).length > 0 ? <Database className="w-3 h-3 text-blue-600" /> : 
               <Activity className="w-3 h-3 text-gray-400" />}
              <span className="text-xs font-mono">{dataSource}</span>
            </div>
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