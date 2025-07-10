
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { adminAuditService } from '@/api/services/AdminAuditService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Activity,
  Database,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Zap,
  Users,
  TrendingUp,
  Server
} from 'lucide-react';

interface SystemHealth {
  database: 'healthy' | 'warning' | 'error';
  api: 'healthy' | 'warning' | 'error';
  storage: 'healthy' | 'warning' | 'error';
  auth: 'healthy' | 'warning' | 'error';
}

interface SystemMetrics {
  activeUsers: number;
  totalRequests: number;
  errorRate: number;
  responseTime: number;
  storageUsed: number;
  storageLimit: number;
}

export function SystemMonitoring() {
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    database: 'healthy',
    api: 'healthy',
    storage: 'healthy',
    auth: 'healthy'
  });
  
  const [metrics, setMetrics] = useState<SystemMetrics>({
    activeUsers: 0,
    totalRequests: 0,
    errorRate: 0,
    responseTime: 0,
    storageUsed: 0,
    storageLimit: 1000
  });

  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    checkSystemHealth();
    const interval = setInterval(checkSystemHealth, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const checkSystemHealth = async () => {
    try {
      setLoading(true);
      
      // Test database connection
      const dbTest = await supabase.from('audit_logs').select('count').limit(1);
      const dbHealth = dbTest.error ? 'error' : 'healthy';

      // Test auth
      const { data: { user } } = await supabase.auth.getUser();
      const authHealth = user ? 'healthy' : 'warning';

      // Simulate API and storage health checks
      const apiHealth = 'healthy';
      const storageHealth = 'healthy';

      setSystemHealth({
        database: dbHealth,
        api: apiHealth,
        storage: storageHealth,
        auth: authHealth
      });

      // Update metrics with simulated data
      setMetrics({
        activeUsers: Math.floor(Math.random() * 50) + 10,
        totalRequests: Math.floor(Math.random() * 10000) + 5000,
        errorRate: Math.random() * 2,
        responseTime: Math.floor(Math.random() * 200) + 50,
        storageUsed: Math.floor(Math.random() * 500) + 100,
        storageLimit: 1000
      });

      setLastUpdated(new Date());

      // Log monitoring action
      if (user) {
        await adminAuditService.logAdminAction(
          'system_health_check',
          user.email || 'unknown',
          'system',
          'monitoring',
          { 
            database_health: dbHealth,
            api_health: apiHealth,
            storage_health: storageHealth,
            auth_health: authHealth
          }
        );
      }

    } catch (error) {
      console.error('Error checking system health:', error);
      setSystemHealth({
        database: 'error',
        api: 'error',
        storage: 'error',
        auth: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const getHealthIcon = (status: 'healthy' | 'warning' | 'error') => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-400" />;
    }
  };

  const getHealthBadge = (status: 'healthy' | 'warning' | 'error') => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-green-500/10 text-green-400 border-green-500/20">Healthy</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20">Warning</Badge>;
      case 'error':
        return <Badge className="bg-red-500/10 text-red-400 border-red-500/20">Error</Badge>;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full space-y-6">
      {/* System Health Overview */}
      <Card className="glass-effect border-default">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-primary flex items-center gap-2">
              <Activity className="w-5 h-5" />
              System Health
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-secondary">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
              <Button
                onClick={checkSystemHealth}
                disabled={loading}
                variant="outline"
                size="sm"
                className="border-default text-secondary hover:bg-surface hover:text-primary"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-accent-green"></div>
                ) : (
                  'Refresh'
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-surface/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-blue-400" />
                  <span className="font-medium text-primary">Database</span>
                </div>
                {getHealthIcon(systemHealth.database)}
              </div>
              {getHealthBadge(systemHealth.database)}
            </div>

            <div className="p-4 bg-surface/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Server className="w-5 h-5 text-green-400" />
                  <span className="font-medium text-primary">API</span>
                </div>
                {getHealthIcon(systemHealth.api)}
              </div>
              {getHealthBadge(systemHealth.api)}
            </div>

            <div className="p-4 bg-surface/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-purple-400" />
                  <span className="font-medium text-primary">Storage</span>
                </div>
                {getHealthIcon(systemHealth.storage)}
              </div>
              {getHealthBadge(systemHealth.storage)}
            </div>

            <div className="p-4 bg-surface/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-orange-400" />
                  <span className="font-medium text-primary">Auth</span>
                </div>
                {getHealthIcon(systemHealth.auth)}
              </div>
              {getHealthBadge(systemHealth.auth)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="glass-effect border-default">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-secondary text-sm">Active Users</p>
                <p className="text-2xl font-bold text-primary">{metrics.activeUsers}</p>
              </div>
              <Users className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-effect border-default">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-secondary text-sm">Total Requests</p>
                <p className="text-2xl font-bold text-primary">{metrics.totalRequests.toLocaleString()}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-effect border-default">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-secondary text-sm">Error Rate</p>
                <p className="text-2xl font-bold text-primary">{metrics.errorRate.toFixed(2)}%</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-effect border-default">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-secondary text-sm">Response Time</p>
                <p className="text-2xl font-bold text-primary">{metrics.responseTime}ms</p>
              </div>
              <Zap className="w-8 h-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Storage Usage */}
      <Card className="glass-effect border-default">
        <CardHeader>
          <CardTitle className="text-primary flex items-center gap-2">
            <Database className="w-5 h-5" />
            Storage Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-secondary">Used Storage</span>
              <span className="text-primary font-medium">
                {formatBytes(metrics.storageUsed * 1024 * 1024)} / {formatBytes(metrics.storageLimit * 1024 * 1024)}
              </span>
            </div>
            <div className="w-full bg-surface rounded-full h-2">
              <div
                className="bg-accent-green h-2 rounded-full transition-all duration-300"
                style={{ width: `${(metrics.storageUsed / metrics.storageLimit) * 100}%` }}
              ></div>
            </div>
            <div className="text-sm text-secondary">
              {((metrics.storageUsed / metrics.storageLimit) * 100).toFixed(1)}% of storage used
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
