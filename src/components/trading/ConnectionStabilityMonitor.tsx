import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useOptimizedWebSocketPrices } from '@/contexts/OptimizedWebSocketPriceContext';
import { useConnectionHealth } from '@/hooks/useConnectionHealth';
import { ConnectionHealthBadge } from '@/components/trading/ConnectionHealthBadge';
import { Zap, Activity, Clock, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const ConnectionStabilityMonitor: React.FC = () => {
  const {
    connectionStatus,
    dataSource,
    lastUpdated,
    errors,
    subscribe,
    unsubscribe
  } = useOptimizedWebSocketPrices();

  const connectionHealth = useConnectionHealth();
  const [isForceConnected, setIsForceConnected] = useState(false);
  const [connectionLog, setConnectionLog] = useState<Array<{
    timestamp: number;
    event: string;
    status: string;
  }>>([]);

  const testSymbols = ['XAUUSD', 'BTCUSD'];

  // Monitor connection status changes
  useEffect(() => {
    const logEntry = {
      timestamp: Date.now(),
      event: 'Connection Status Change',
      status: connectionStatus
    };
    
    setConnectionLog(prev => [...prev, logEntry].slice(-10)); // Keep last 10 entries
  }, [connectionStatus]);

  // Force keep connection alive
  useEffect(() => {
    if (isForceConnected) {
      const interval = setInterval(() => {
        if (connectionStatus !== 'connected') {
          console.log('🔄 Force reconnecting due to connection loss...');
          subscribe(testSymbols);
        }
      }, 5000); // Check every 5 seconds

      return () => clearInterval(interval);
    }
  }, [isForceConnected, connectionStatus, subscribe]);

  const handleForceConnect = () => {
    setIsForceConnected(!isForceConnected);
    if (!isForceConnected) {
      subscribe(testSymbols);
    } else {
      unsubscribe(testSymbols);
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'text-emerald-400';
      case 'connecting':
        return 'text-blue-400';
      case 'disconnected':
        return 'text-yellow-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return CheckCircle;
      case 'connecting':
        return Activity;
      case 'disconnected':
        return AlertTriangle;
      case 'error':
        return AlertTriangle;
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
            <StatusIcon className={`w-5 h-5 ${getStatusColor()}`} />
            <span>Connection Stability Monitor</span>
          </div>
          <Button
            onClick={handleForceConnect}
            variant={isForceConnected ? "destructive" : "default"}
            size="sm"
          >
            {isForceConnected ? 'Stop' : 'Force'} Connection
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Current Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-sm font-medium text-white mb-3">Current Status</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Connection:</span>
                <span className={getStatusColor()}>{connectionStatus}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Data Source:</span>
                <span className="text-white">{dataSource}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Last Update:</span>
                <span className="text-white">
                  {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Never'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Force Connected:</span>
                <span className={isForceConnected ? 'text-emerald-400' : 'text-gray-400'}>
                  {isForceConnected ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>

          <ConnectionHealthBadge showDetails={true} />
        </div>

        {/* Error Display */}
        {Object.keys(errors).length > 0 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <h3 className="text-sm font-medium text-red-400 mb-2">Connection Errors</h3>
            <div className="space-y-1">
              {Object.entries(errors).map(([key, error]) => (
                <div key={key} className="text-xs text-red-300">
                  <span className="font-medium">{key}:</span> {error}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Connection Log */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium text-white mb-3">Connection Activity Log</h3>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {connectionLog.length > 0 ? (
              connectionLog.slice().reverse().map((entry, index) => (
                <div key={index} className="flex items-center justify-between text-xs p-2 bg-background rounded border border-border/50">
                  <span className="text-gray-400">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="text-white">{entry.event}</span>
                  <span className={
                    entry.status === 'connected' ? 'text-emerald-400' :
                    entry.status === 'connecting' ? 'text-blue-400' :
                    entry.status === 'disconnected' ? 'text-yellow-400' :
                    'text-red-400'
                  }>
                    {entry.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-gray-400 text-xs">No connection events logged</div>
            )}
          </div>
        </div>

        {/* Stability Metrics */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium text-white mb-3">Stability Metrics</h3>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <div className="text-gray-400">Health Status</div>
              <div className={connectionHealth.isHealthy ? 'text-emerald-400' : 'text-red-400'}>
                {connectionHealth.isHealthy ? 'Healthy' : 'Unhealthy'}
              </div>
            </div>
            <div>
              <div className="text-gray-400">Tick Frequency</div>
              <div className="text-white">{connectionHealth.actualFrequency || 0}ms</div>
            </div>
            <div>
              <div className="text-gray-400">Connection Uptime</div>
              <div className={connectionHealth.connectionUptime >= 95 ? 'text-emerald-400' : 'text-yellow-400'}>
                {connectionHealth.connectionUptime}%
              </div>
            </div>
            <div>
              <div className="text-gray-400">Missed Ticks</div>
              <div className={connectionHealth.missedTicks === 0 ? 'text-emerald-400' : 'text-yellow-400'}>
                {connectionHealth.missedTicks}
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="text-center text-sm text-gray-400 bg-background/50 rounded-lg p-3">
          💡 <strong>Force Connection</strong> keeps the WebSocket alive by auto-reconnecting every 5 seconds if disconnected
          <br />
          This ensures continuous 250ms price updates for critical trading operations
        </div>
      </CardContent>
    </Card>
  );
};
