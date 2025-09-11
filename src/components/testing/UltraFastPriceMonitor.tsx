import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useOptimizedWebSocketPrices } from '@/contexts/OptimizedWebSocketPriceContext';
import { useConnectionHealth } from '@/hooks/useConnectionHealth';
import { ConnectionHealthBadge } from '@/components/trading/ConnectionHealthBadge';
import { Zap, Activity, Clock, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const UltraFastPriceMonitor: React.FC = () => {
  const {
    prices,
    connectionStatus,
    dataSource,
    lastUpdated,
    errors,
    subscribe,
    unsubscribe
  } = useOptimizedWebSocketPrices();

  const connectionHealth = useConnectionHealth();
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [tickLog, setTickLog] = useState<Array<{
    symbol: string;
    price: number;
    timestamp: number;
    frequency: string;
    isUltraFast: boolean;
  }>>([]);

  const testSymbols = ['XAUUSD', 'BTCUSD'];

  useEffect(() => {
    if (isMonitoring) {
      subscribe(testSymbols);
    } else {
      unsubscribe(testSymbols);
    }

    return () => {
      if (isMonitoring) {
        unsubscribe(testSymbols);
      }
    };
  }, [isMonitoring, subscribe, unsubscribe]);

  // Log price updates for analysis
  useEffect(() => {
    if (lastUpdated) {
      const newTicks = Object.entries(prices).map(([symbol, priceData]) => ({
        symbol,
        price: priceData.price,
        timestamp: Date.now(),
        frequency: '250ms', // Simplified for hybrid system
        isUltraFast: false // Simplified for hybrid system
      }));

      setTickLog(prev => {
        const updated = [...prev, ...newTicks].slice(-50); // Keep last 50 ticks
        return updated;
      });
    }
  }, [lastUpdated, prices]);

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return connectionHealth.isHealthy ? 'text-emerald-400' : 'text-yellow-400';
      case 'connecting':
        return 'text-blue-400';
      case 'disconnected':
        return 'text-red-400';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return connectionHealth.isHealthy ? Zap : Activity;
      case 'connecting':
        return Activity;
      default:
        return Clock;
    }
  };

  const StatusIcon = getStatusIcon();

  return (
    <Card className="w-full bg-background border-border">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusIcon className={`w-5 h-5 ${getConnectionStatusColor()}`} />
            <span>Ultra-Fast 250ms Price Monitor</span>
          </div>
          <Button
            onClick={() => setIsMonitoring(!isMonitoring)}
            variant={isMonitoring ? "destructive" : "default"}
            size="sm"
          >
            {isMonitoring ? 'Stop' : 'Start'} Monitoring
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Connection Health Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ConnectionHealthBadge showDetails={true} />
          
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-sm font-medium text-white mb-3">Performance Metrics</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Target Frequency:</span>
                <span className="text-emerald-400 font-mono">250ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Actual Frequency:</span>
                <span className={`font-mono ${
                  connectionHealth.actualFrequency <= 300 ? 'text-emerald-400' : 
                  connectionHealth.actualFrequency <= 500 ? 'text-green-400' : 
                  'text-yellow-400'
                }`}>
                  {connectionHealth.actualFrequency > 0 ? `${connectionHealth.actualFrequency}ms` : '--'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Connection Uptime:</span>
                <span className={`font-mono ${
                  connectionHealth.connectionUptime >= 95 ? 'text-emerald-400' : 
                  connectionHealth.connectionUptime >= 90 ? 'text-green-400' : 
                  'text-yellow-400'
                }`}>
                  {connectionHealth.connectionUptime}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Missed Ticks:</span>
                <span className={`font-mono ${
                  connectionHealth.missedTicks === 0 ? 'text-emerald-400' : 
                  connectionHealth.missedTicks < 5 ? 'text-green-400' : 
                  'text-yellow-400'
                }`}>
                  {connectionHealth.missedTicks}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Price Data */}
        {isMonitoring && (
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-sm font-medium text-white mb-3">Live Symbol Data</h3>
            <div className="grid gap-3">
              {testSymbols.map(symbol => {
                const priceData = prices[symbol];
                const error = errors[symbol];

                return (
                  <div key={symbol} className="flex items-center justify-between p-3 bg-background rounded border border-border">
                    <div className="flex items-center gap-3">
                      <div className="text-white font-medium">{symbol}</div>
                      <div className="px-2 py-0.5 bg-blue-500/20 border border-blue-500/30 rounded text-xs text-blue-400">
                        Hybrid System
                      </div>
                    </div>
                    
                    <div className="text-right">
                      {error ? (
                        <div className="text-red-400 text-sm">{error}</div>
                      ) : priceData ? (
                        <>
                          <div className="text-white font-mono text-lg">
                            ${priceData.price.toFixed(priceData.price > 100 ? 2 : 5)}
                          </div>
                          <div className="text-xs text-gray-400">
                            250ms • {new Date(priceData.timestamp).toLocaleTimeString()}
                          </div>
                        </>
                      ) : (
                        <div className="text-gray-400 text-sm">No data</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tick Log */}
        {isMonitoring && tickLog.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-sm font-medium text-white mb-3">Recent Tick Log (Last 10)</h3>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {tickLog.slice(-10).reverse().map((tick, index) => (
                <div key={index} className="flex items-center justify-between text-xs font-mono p-2 bg-background rounded border border-border/50">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">{new Date(tick.timestamp).toLocaleTimeString()}</span>
                    <span className="text-white">{tick.symbol}</span>
                    {tick.isUltraFast && (
                      <span className="text-emerald-400">⚡</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white">${tick.price.toFixed(tick.price > 100 ? 2 : 5)}</span>
                    <span className="text-gray-400">{tick.frequency}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Connection Status */}
        <div className="text-center text-sm text-gray-400">
          Status: <span className={getConnectionStatusColor()}>{connectionStatus}</span> • 
          Source: <span className="text-white">{dataSource}</span> • 
          Last Update: <span className="text-white">
            {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Never'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};