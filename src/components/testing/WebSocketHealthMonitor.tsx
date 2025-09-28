import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useOptimizedWebSocketPrices } from '@/contexts/OptimizedWebSocketPriceContext';
import { pricePerformanceMonitor } from '@/utils/pricePerformanceMonitor';
import { Activity, Heart, Zap, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { useMonitoringRouteGate } from '@/hooks/useMonitoringRouteGate';

interface HealthCheck {
  name: string;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  message: string;
  lastCheck: number;
  value?: number;
  threshold?: number;
}

interface SystemHealth {
  overall: 'healthy' | 'warning' | 'critical' | 'unknown';
  checks: HealthCheck[];
  uptime: number;
  startTime: number;
}

export const WebSocketHealthMonitor: React.FC = () => {
  const { connectionStatus, prices, dataSource } = useOptimizedWebSocketPrices();
  const { shouldEnableMonitoring } = useMonitoringRouteGate();
  const [health, setHealth] = useState<SystemHealth>({
    overall: 'unknown',
    checks: [],
    uptime: 0,
    startTime: Date.now()
  });
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Perform comprehensive health checks
  const performHealthChecks = useCallback(() => {
    const now = Date.now();
    const checks: HealthCheck[] = [];
    
    // WebSocket Connection Health
    checks.push({
      name: 'WebSocket Connection',
      status: connectionStatus === 'connected' ? 'healthy' : 
              connectionStatus === 'connecting' ? 'warning' : 'critical',
      message: `Connection status: ${connectionStatus}`,
      lastCheck: now
    });

    // Data Flow Health
    const priceCount = Object.keys(prices).length;
    checks.push({
      name: 'Data Flow',
      status: priceCount > 0 ? 'healthy' : 'warning',
      message: `${priceCount} symbols receiving data`,
      lastCheck: now,
      value: priceCount
    });

    // Performance Metrics
    const perfMetrics = pricePerformanceMonitor.getMetrics();
    const latencyStatus = perfMetrics.avgLatencyMs < 100 ? 'healthy' :
                         perfMetrics.avgLatencyMs < 500 ? 'warning' : 'critical';
    
    checks.push({
      name: 'Latency',
      status: latencyStatus,
      message: `Average latency: ${perfMetrics.avgLatencyMs.toFixed(1)}ms`,
      lastCheck: now,
      value: perfMetrics.avgLatencyMs,
      threshold: 100
    });

    // Update Rate Health
    const updateRate = perfMetrics.priceUpdatesReceived > 0 ? 'healthy' : 'warning';
    checks.push({
      name: 'Update Rate',
      status: updateRate,
      message: `${perfMetrics.priceUpdatesReceived} updates received`,
      lastCheck: now,
      value: perfMetrics.priceUpdatesReceived
    });

    // Data Source Health
    checks.push({
      name: 'Data Source',
      status: dataSource === 'Enhanced WebSocket' ? 'healthy' : 'warning',
      message: `Using: ${dataSource}`,
      lastCheck: now
    });

    // Efficiency Check
    const efficiency = perfMetrics.efficiencyRatio;
    const efficiencyStatus = efficiency > 0.5 ? 'healthy' :
                            efficiency > 0.2 ? 'warning' : 'critical';
    
    checks.push({
      name: 'Filter Efficiency',
      status: efficiencyStatus,
      message: `${(efficiency * 100).toFixed(1)}% of updates filtered`,
      lastCheck: now,
      value: efficiency * 100,
      threshold: 50
    });

    // Overall health assessment
    const healthyCount = checks.filter(c => c.status === 'healthy').length;
    const warningCount = checks.filter(c => c.status === 'warning').length;
    const criticalCount = checks.filter(c => c.status === 'critical').length;

    const overall = criticalCount > 0 ? 'critical' :
                   warningCount > 0 ? 'warning' : 'healthy';

    setHealth(prev => ({
      overall,
      checks,
      uptime: now - prev.startTime,
      startTime: prev.startTime
    }));
  }, [connectionStatus, prices, dataSource]);

  // Auto-monitoring
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    // 🚨 ROUTE GATE: Only run health monitoring on dashboard/admin routes
    if (isMonitoring && shouldEnableMonitoring) {
      // Initial check
      performHealthChecks();
      
      // Regular checks every 5 seconds
      interval = setInterval(performHealthChecks, 5000);
    } else if (isMonitoring && !shouldEnableMonitoring) {
      console.log('🚫 WebSocketHealthMonitor: Disabled on landing page routes for cost optimization');
      setIsMonitoring(false);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isMonitoring, shouldEnableMonitoring, performHealthChecks]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'warning': return <AlertCircle className="h-4 w-4 text-warning" />;
      case 'critical': return <AlertCircle className="h-4 w-4 text-destructive" />;
      default: return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-success text-success-foreground';
      case 'warning': return 'bg-warning text-warning-foreground';
      case 'critical': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getOverallHealthScore = () => {
    const totalChecks = health.checks.length;
    if (totalChecks === 0) return 0;
    
    const healthyCount = health.checks.filter(c => c.status === 'healthy').length;
    const warningCount = health.checks.filter(c => c.status === 'warning').length;
    
    return Math.round(((healthyCount * 1 + warningCount * 0.5) / totalChecks) * 100);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5" />
          WebSocket Health Monitor
        </CardTitle>
        <CardDescription>
          Real-time monitoring of WebSocket connection and data flow health
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Health Status */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Heart className={`h-8 w-8 ${
                health.overall === 'healthy' ? 'text-success' :
                health.overall === 'warning' ? 'text-warning' :
                health.overall === 'critical' ? 'text-destructive' : 'text-muted-foreground'
              }`} />
              {isMonitoring && (
                <div className="absolute -top-1 -right-1 h-3 w-3 bg-success rounded-full animate-pulse"></div>
              )}
            </div>
            <div>
              <div className="font-semibold">System Health</div>
              <div className="text-sm text-muted-foreground">
                Uptime: {Math.floor(health.uptime / 60000)}m {Math.floor((health.uptime % 60000) / 1000)}s
              </div>
            </div>
          </div>
          <div className="text-right">
            <Badge className={getStatusColor(health.overall)}>
              {health.overall.toUpperCase()}
            </Badge>
            <div className="mt-2">
              <Progress value={getOverallHealthScore()} className="w-24 h-2" />
              <div className="text-xs text-muted-foreground mt-1">
                {getOverallHealthScore()}% healthy
              </div>
            </div>
          </div>
        </div>

        {/* Control Panel */}
        <div className="flex gap-2">
          <Button
            onClick={() => setIsMonitoring(!isMonitoring)}
            variant={isMonitoring ? "destructive" : "default"}
          >
            {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
          </Button>
          <Button onClick={performHealthChecks} variant="outline">
            Run Check Now
          </Button>
          <Button 
            onClick={() => pricePerformanceMonitor.logSummary()} 
            variant="outline"
          >
            Log Performance
          </Button>
        </div>

        {/* Health Checks */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Health Checks</h4>
          {health.checks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2" />
              <p>No health checks performed yet</p>
              <p className="text-xs">Click "Start Monitoring" or "Run Check Now"</p>
            </div>
          ) : (
            health.checks.map((check, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                <div className="flex items-center gap-3">
                  {getStatusIcon(check.status)}
                  <div>
                    <div className="font-medium text-sm">{check.name}</div>
                    <div className="text-xs text-muted-foreground">{check.message}</div>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className={getStatusColor(check.status)}>
                    {check.status}
                  </Badge>
                  {check.value !== undefined && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {typeof check.value === 'number' ? check.value.toFixed(1) : check.value}
                      {check.threshold && ` / ${check.threshold}`}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Quick Actions */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <h4 className="text-sm font-medium mb-2">Quick Diagnostics</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>Connection: <span className="font-mono">{connectionStatus}</span></div>
            <div>Data Source: <span className="font-mono">{dataSource}</span></div>
            <div>Active Symbols: <span className="font-mono">{Object.keys(prices).length}</span></div>
            <div>Last Check: <span className="font-mono">
              {health.checks.length > 0 ? new Date(Math.max(...health.checks.map(c => c.lastCheck))).toLocaleTimeString() : 'Never'}
            </span></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};