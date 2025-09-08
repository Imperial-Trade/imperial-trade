// Phase 4: Comprehensive Pipeline Health Dashboard
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { pricePerformanceMonitor, type PerformanceMetrics } from '@/utils/pricePerformanceMonitor';
import { useOptimizedLivePrice } from '@/hooks/useOptimizedLivePrice';

export const PipelineHealthDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics & { efficiencyRatio: number; uptime: number } | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  
  // Monitor key symbols for pipeline health
  const xauusdPrice = useOptimizedLivePrice('XAUUSD');
  const btcusdPrice = useOptimizedLivePrice('BTCUSD');
  const eurusdPrice = useOptimizedLivePrice('EURUSD');

  useEffect(() => {
    if (!isMonitoring) return;

    const interval = setInterval(() => {
      setMetrics(pricePerformanceMonitor.getMetrics());
    }, 1000);

    return () => clearInterval(interval);
  }, [isMonitoring]);

  const startMonitoring = () => {
    setIsMonitoring(true);
    pricePerformanceMonitor.reset();
    console.log('📊 Started pipeline health monitoring');
  };

  const stopMonitoring = () => {
    setIsMonitoring(false);
    pricePerformanceMonitor.logSummary();
    console.log('📊 Stopped pipeline health monitoring');
  };

  const getHealthStatus = () => {
    if (!metrics) return { status: 'Unknown', color: 'bg-gray-500' };
    
    const hasActiveConnections = [xauusdPrice, btcusdPrice, eurusdPrice].some(p => p.isConnected);
    const hasRecentData = [xauusdPrice, btcusdPrice, eurusdPrice].some(p => !p.isStale);
    const goodLatency = metrics.avgLatencyMs < 1000;
    
    if (hasActiveConnections && hasRecentData && goodLatency) {
      return { status: 'Healthy', color: 'bg-green-500' };
    } else if (hasActiveConnections || hasRecentData) {
      return { status: 'Degraded', color: 'bg-yellow-500' };
    } else {
      return { status: 'Critical', color: 'bg-red-500' };
    }
  };

  const health = getHealthStatus();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              🏥 Pipeline Health Dashboard
              <Badge className={`text-white ${health.color}`}>
                {health.status}
              </Badge>
            </CardTitle>
            <Button
              onClick={isMonitoring ? stopMonitoring : startMonitoring}
              variant={isMonitoring ? "destructive" : "default"}
            >
              {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Real-time Connection Status */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 border rounded">
              <div className="text-sm font-medium">XAUUSD</div>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={`text-white ${xauusdPrice.isConnected ? 'bg-green-500' : 'bg-red-500'}`}>
                  {xauusdPrice.isConnected ? 'Connected' : 'Disconnected'}
                </Badge>
                {xauusdPrice.livePrice && (
                  <span className="text-sm">${xauusdPrice.livePrice.toFixed(2)}</span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                Age: {xauusdPrice.isStale ? 'Stale' : 'Fresh'}
              </div>
            </div>

            <div className="p-3 border rounded">
              <div className="text-sm font-medium">BTCUSD</div>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={`text-white ${btcusdPrice.isConnected ? 'bg-green-500' : 'bg-red-500'}`}>
                  {btcusdPrice.isConnected ? 'Connected' : 'Disconnected'}
                </Badge>
                {btcusdPrice.livePrice && (
                  <span className="text-sm">${btcusdPrice.livePrice.toFixed(2)}</span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                Age: {btcusdPrice.isStale ? 'Stale' : 'Fresh'}
              </div>
            </div>

            <div className="p-3 border rounded">
              <div className="text-sm font-medium">EURUSD</div>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={`text-white ${eurusdPrice.isConnected ? 'bg-green-500' : 'bg-red-500'}`}>
                  {eurusdPrice.isConnected ? 'Connected' : 'Disconnected'}
                </Badge>
                {eurusdPrice.livePrice && (
                  <span className="text-sm">${eurusdPrice.livePrice.toFixed(4)}</span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                Age: {eurusdPrice.isStale ? 'Stale' : 'Fresh'}
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          {metrics && isMonitoring && (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 border rounded">
                <div className="text-sm font-medium">Data Efficiency</div>
                <div className="text-2xl font-bold text-green-600">
                  {(metrics.efficiencyRatio * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground">
                  {metrics.priceUpdatesFiltered}/{metrics.priceUpdatesReceived} filtered
                </div>
              </div>

              <div className="p-3 border rounded">
                <div className="text-sm font-medium">UI Performance</div>
                <div className="text-2xl font-bold text-blue-600">
                  {metrics.uiUpdatesRendered}
                </div>
                <div className="text-xs text-muted-foreground">
                  UI updates rendered
                </div>
              </div>

              <div className="p-3 border rounded">
                <div className="text-sm font-medium">Average Latency</div>
                <div className="text-2xl font-bold text-purple-600">
                  {metrics.avgLatencyMs.toFixed(0)}ms
                </div>
                <div className="text-xs text-muted-foreground">
                  Response time
                </div>
              </div>

              <div className="p-3 border rounded">
                <div className="text-sm font-medium">Uptime</div>
                <div className="text-2xl font-bold text-orange-600">
                  {Math.floor(metrics.uptime / 60000)}m
                </div>
                <div className="text-xs text-muted-foreground">
                  Monitoring duration
                </div>
              </div>
            </div>
          )}

          {!isMonitoring && (
            <div className="text-center text-muted-foreground p-4">
              Click "Start Monitoring" to track real-time pipeline performance
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};