import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useWebSocketPrices } from '@/contexts/WebSocketPriceContext';
import { Activity, Zap, AlertTriangle, CheckCircle, Clock, TrendingUp } from 'lucide-react';

interface DevOpsMetrics {
  connectionUptime: number;
  priceUpdateFrequency: number;
  apiKeyHealth: 'healthy' | 'degraded' | 'critical';
  dataValidationErrors: number;
  emergencyMode: boolean;
  lastPriceUpdate: Date | null;
}

export const DevOpsMonitoringDashboard: React.FC = () => {
  const { connectionStatus, lastUpdated, errors } = useWebSocketPrices();
  const [metrics, setMetrics] = useState<DevOpsMetrics>({
    connectionUptime: 0,
    priceUpdateFrequency: 0,
    apiKeyHealth: 'healthy',
    dataValidationErrors: 0,
    emergencyMode: false,
    lastPriceUpdate: null
  });

  const [startTime] = useState(Date.now());
  const [updateCount, setUpdateCount] = useState(0);

  useEffect(() => {
    if (lastUpdated) {
      setUpdateCount(prev => prev + 1);
      setMetrics(prev => ({
        ...prev,
        lastPriceUpdate: lastUpdated
      }));
    }
  }, [lastUpdated]);

  useEffect(() => {
    const interval = setInterval(() => {
      const uptime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
      const frequency = updateCount > 0 ? (updateCount / ((Date.now() - startTime) / 1000)).toFixed(1) : '0';
      
      setMetrics(prev => ({
        ...prev,
        connectionUptime: parseFloat(uptime),
        priceUpdateFrequency: parseFloat(frequency),
        apiKeyHealth: connectionStatus === 'connected' ? 'healthy' : 
                     connectionStatus === 'connecting' ? 'degraded' : 'critical',
        dataValidationErrors: Object.keys(errors).length,
        emergencyMode: connectionStatus === 'error'
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, updateCount, connectionStatus, errors]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-400';
      case 'connecting': return 'text-yellow-400';
      case 'disconnected': return 'text-orange-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getHealthBadgeVariant = (health: string) => {
    switch (health) {
      case 'healthy': return 'default';
      case 'degraded': return 'secondary';
      case 'critical': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <Card className="w-full bg-background border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          DevOps Monitoring Dashboard
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Connection Status */}
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">Connection</h3>
              <CheckCircle className={`w-4 h-4 ${getStatusColor(connectionStatus)}`} />
            </div>
            <div className={`text-lg font-bold ${getStatusColor(connectionStatus)}`}>
              {connectionStatus.toUpperCase()}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Uptime: {metrics.connectionUptime}m
            </div>
          </div>

          {/* Price Update Frequency */}
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">Update Rate</h3>
              <Zap className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-lg font-bold text-white">
              {metrics.priceUpdateFrequency}/s
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Total: {updateCount} updates
            </div>
          </div>

          {/* API Key Health */}
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">API Health</h3>
              <Badge variant={getHealthBadgeVariant(metrics.apiKeyHealth)}>
                {metrics.apiKeyHealth}
              </Badge>
            </div>
            <div className="text-lg font-bold text-white">
              {metrics.dataValidationErrors} errors
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {metrics.emergencyMode ? 'Emergency Mode' : 'Normal Operation'}
            </div>
          </div>
        </div>

        {/* Last Update Info */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Last Price Update</span>
            </div>
            <div className="text-sm text-white">
              {metrics.lastPriceUpdate 
                ? metrics.lastPriceUpdate.toLocaleTimeString()
                : 'No updates received'
              }
            </div>
          </div>
        </div>

        {/* Error Display */}
        {Object.keys(errors).length > 0 && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <h3 className="text-sm font-medium text-destructive">Active Errors</h3>
            </div>
            <div className="space-y-1">
              {Object.entries(errors).map(([key, error]) => (
                <div key={key} className="text-xs text-destructive/80">
                  <span className="font-medium">{key}:</span> {error}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Performance Indicators */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center justify-between py-2 px-3 bg-muted/20 rounded">
            <span className="text-xs text-muted-foreground">Data Source</span>
            <span className="text-xs font-mono text-white">TraderMade FIX</span>
          </div>
          <div className="flex items-center justify-between py-2 px-3 bg-muted/20 rounded">
            <span className="text-xs text-muted-foreground">Protocol</span>
            <span className="text-xs font-mono text-white">WebSocket</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};