import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, Activity, Zap, TrendingUp } from 'lucide-react';
import { useOptimizedWebSocketPrices } from '@/contexts/OptimizedWebSocketPriceContext';
import { PriceConnectionStatus } from '@/components/realtime/PriceConnectionStatus';
import WebSocketDiagnostics from '@/components/debug/WebSocketDiagnostics';
import { LivePricePerformanceMonitor } from '@/components/realtime/LivePricePerformanceMonitor';
import { ConnectionStabilityMonitor } from '@/components/trading/ConnectionStabilityMonitor';

export const LivePriceDiagnosticsPanel: React.FC = () => {
  const { 
    connectionStatus, 
    prices, 
    error, 
    lastUpdated, 
    getStats, 
    getConnectionHealth,
    restartConnection,
    dataSource 
  } = useOptimizedWebSocketPrices();

  const stats = getStats?.() || { messagesReceived: 0, reconnections: 0, avgLatency: 0 };
  const health = getConnectionHealth();
  const priceSymbols = Object.keys(prices);

  const handleRestartConnection = async () => {
    // Use context method for clean reconnection
    restartConnection();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6" />
            Live Price Diagnostics
          </h2>
          <p className="text-muted-foreground">
            Monitor and troubleshoot real-time price data connections
          </p>
        </div>
        <Button onClick={handleRestartConnection} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Restart Connection
        </Button>
      </div>

      {/* Connection Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <PriceConnectionStatus />
            </div>
            <Activity className="w-8 h-8 text-muted-foreground" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Data Source</p>
              <p className="text-lg font-semibold">{dataSource}</p>
            </div>
            <Zap className="w-8 h-8 text-muted-foreground" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Symbols</p>
              <p className="text-lg font-semibold">{priceSymbols.length}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-muted-foreground" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Last Update</p>
              <p className="text-sm">
                {lastUpdated 
                  ? new Date(lastUpdated).toLocaleTimeString()
                  : 'Never'
                }
              </p>
            </div>
            <RefreshCw className="w-8 h-8 text-muted-foreground" />
          </div>
        </Card>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="p-4 border-destructive">
          <div className="flex items-center gap-2">
            <Badge variant="destructive">Error</Badge>
            <span className="text-sm text-destructive">{error}</span>
          </div>
        </Card>
      )}

      {/* Diagnostic Components */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Connection Diagnostics</h3>
          <WebSocketDiagnostics symbols={priceSymbols} />
          <ConnectionStabilityMonitor />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Performance Metrics</h3>
          <LivePricePerformanceMonitor />
          
          {/* Statistics Summary */}
          <Card className="p-4">
            <h4 className="font-semibold mb-3">Connection Statistics</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Messages:</span>
                <span className="font-mono">{stats.messagesReceived}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reconnections:</span>
                <span className="font-mono">{stats.reconnections}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg Latency:</span>
                <span className="font-mono">{stats.avgLatency.toFixed(1)}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Health Status:</span>
                <Badge variant={health.isHealthy ? "default" : "destructive"}>
                  {health.isHealthy ? "Healthy" : "Unhealthy"}
                </Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Active Price Data */}
      {priceSymbols.length > 0 && (
        <Card className="p-4">
          <h4 className="font-semibold mb-3">Active Price Data</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            {priceSymbols.slice(0, 12).map(symbol => {
              const price = prices[symbol];
              return (
                <div key={symbol} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                  <span className="font-mono">{symbol}</span>
                  <div className="text-right">
                    <div className="font-mono font-semibold">{price.price.toFixed(5)}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(price.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {priceSymbols.length > 12 && (
            <p className="text-sm text-muted-foreground mt-2">
              ... and {priceSymbols.length - 12} more symbols
            </p>
          )}
        </Card>
      )}
    </div>
  );
};