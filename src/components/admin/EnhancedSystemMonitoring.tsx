
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Activity,
  Server,
  Database,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Users,
  Shield
} from 'lucide-react';
import { performanceMonitor } from '@/services/PerformanceMonitorService';
import { adminSecurity } from '@/services/AdminSecurityService';
import { cacheService } from '@/services/CacheService';
import { useMonitoringRouteGate } from '@/hooks/useMonitoringRouteGate';

export const EnhancedSystemMonitoring: React.FC = () => {
  const { shouldEnableMonitoring } = useMonitoringRouteGate();
  const [systemHealth, setSystemHealth] = useState(performanceMonitor.getSystemHealth());
  const [metrics, setMetrics] = useState(performanceMonitor.getMetrics());
  const [securityAlerts, setSecurityAlerts] = useState(adminSecurity.getSecurityAlerts(10));
  const [activeSessions, setActiveSessions] = useState(adminSecurity.getActiveSessions());
  const [cacheStats, setCacheStats] = useState(cacheService.getStats());

  useEffect(() => {
    if (!shouldEnableMonitoring) {
      console.log('🚫 EnhancedSystemMonitoring: Route gating disabled monitoring');
      return;
    }

    const interval = setInterval(() => {
      setSystemHealth(performanceMonitor.getSystemHealth());
      setMetrics(performanceMonitor.getMetrics());
      setSecurityAlerts(adminSecurity.getSecurityAlerts(10));
      setActiveSessions(adminSecurity.getActiveSessions());
      setCacheStats(cacheService.getStats());
    }, 5000);

    return () => clearInterval(interval);
  }, [shouldEnableMonitoring]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'degraded': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'critical': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <Activity className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'degraded': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'critical': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const averageResponseTime = performanceMonitor.getAverageResponseTime();
  const recentMetrics = metrics.slice(-10);

  return (
    <div className="space-y-6">
      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">System Status</p>
                <div className="flex items-center gap-2 mt-1">
                  {getStatusIcon(systemHealth.status)}
                  <Badge className={getStatusColor(systemHealth.status)}>
                    {systemHealth.status.toUpperCase()}
                  </Badge>
                </div>
              </div>
              <Server className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Response Time</p>
                <p className="text-2xl font-bold text-primary">
                  {averageResponseTime.toFixed(0)}ms
                </p>
              </div>
              <Clock className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Sessions</p>
                <p className="text-2xl font-bold text-primary">
                  {activeSessions.length}
                </p>
              </div>
              <Users className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Error Rate</p>
                <p className="text-2xl font-bold text-primary">
                  {(systemHealth.errorRate * 100).toFixed(1)}%
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="performance" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="cache">Cache</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Response Time</span>
                    <span>{averageResponseTime.toFixed(0)}ms</span>
                  </div>
                  <Progress 
                    value={Math.min((averageResponseTime / 3000) * 100, 100)} 
                    className="w-full"
                  />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Error Rate</span>
                    <span>{(systemHealth.errorRate * 100).toFixed(1)}%</span>
                  </div>
                  <Progress 
                    value={systemHealth.errorRate * 100} 
                    className="w-full"
                  />
                </div>

                {recentMetrics.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Recent API Calls</h4>
                    <div className="space-y-1">
                      {recentMetrics.map((metric, index) => (
                        <div key={index} className="flex justify-between text-xs">
                          <span className="truncate">{metric.name}</span>
                          <span className={`${metric.value > 2000 ? 'text-red-500' : metric.value > 1000 ? 'text-yellow-500' : 'text-green-500'}`}>
                            {metric.value.toFixed(0)}ms
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {securityAlerts.length === 0 ? (
                  <p className="text-sm text-gray-500">No recent security alerts</p>
                ) : (
                  securityAlerts.map((alert, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                      <AlertTriangle className={`w-4 h-4 mt-0.5 ${
                        alert.severity === 'critical' ? 'text-red-500' :
                        alert.severity === 'high' ? 'text-orange-500' :
                        alert.severity === 'medium' ? 'text-yellow-500' : 'text-blue-500'
                      }`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={`text-xs ${
                            alert.severity === 'critical' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                            alert.severity === 'high' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                            alert.severity === 'medium' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                            'bg-blue-500/10 text-blue-500 border-blue-500/20'
                          }`}>
                            {alert.severity}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {alert.timestamp.toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm">{alert.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cache" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Cache Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Total Entries</p>
                  <p className="text-2xl font-bold text-primary">{cacheStats.totalEntries}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Memory Usage</p>
                  <p className="text-2xl font-bold text-primary">
                    {(cacheStats.memoryUsage / 1024).toFixed(1)}KB
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Active Admin Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activeSessions.length === 0 ? (
                  <p className="text-sm text-gray-500">No active admin sessions</p>
                ) : (
                  activeSessions.map((session, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{session.email}</p>
                        <p className="text-xs text-gray-500">
                          Login: {session.loginTime.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          Last Activity: {session.lastActivity.toLocaleString()}
                        </p>
                      </div>
                      <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                        Active
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
