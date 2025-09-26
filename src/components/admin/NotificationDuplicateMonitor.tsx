import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useMonitoringRouteGate } from '@/hooks/useMonitoringRouteGate';

interface NotificationMetrics {
  totalSent: number;
  totalDuplicates: number;
  duplicateRate: number;
  recentDuplicates: Array<{
    signal_id: string;
    event_key: string;
    count: number;
    timestamp: string;
  }>;
  triggerHealth: {
    activeTriggers: number;
    healthStatus: 'healthy' | 'warning' | 'critical';
  };
}

export function NotificationDuplicateMonitor() {
  const [metrics, setMetrics] = useState<NotificationMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const { shouldEnableMonitoring } = useMonitoringRouteGate();

  const fetchMetrics = async () => {
    try {
      // Get recent notification logs
      const { data: logs, error: logsError } = await supabase
        .from('cron_job_logs')
        .select('*')
        .eq('job_name', 'enhanced_notification_pipeline')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(1000);

      if (logsError) throw logsError;

      // Get active triggers
      const { data: triggers, error: triggersError } = await supabase
        .rpc('get_active_notification_triggers');

      if (triggersError) throw triggersError;

      // Calculate metrics
      const totalSent = logs?.filter(log => log.status === 'success').length || 0;
      const duplicates = logs?.filter(log => 
        log.error_message?.includes('duplicate') || 
        log.error_message?.includes('Changes: ,') ||
        log.error_message?.includes('Change types: none')
      ) || [];

      const duplicateRate = totalSent > 0 ? (duplicates.length / totalSent) * 100 : 0;

      // Group duplicates by signal
      const duplicateGroups = duplicates.reduce((acc, log) => {
        const signalId = extractSignalId(log.error_message || '');
        if (!acc[signalId]) acc[signalId] = [];
        acc[signalId].push(log);
        return acc;
      }, {} as Record<string, any[]>);

      const recentDuplicates = Object.entries(duplicateGroups)
        .map(([signalId, logs]) => ({
          signal_id: signalId,
          event_key: extractEventKey(logs[0]?.error_message || ''),
          count: logs.length,
          timestamp: logs[0]?.created_at
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setMetrics({
        totalSent,
        totalDuplicates: duplicates.length,
        duplicateRate: Math.round(duplicateRate * 100) / 100,
        recentDuplicates,
        triggerHealth: {
          activeTriggers: triggers?.length || 0,
          healthStatus: duplicateRate > 50 ? 'critical' : duplicateRate > 20 ? 'warning' : 'healthy'
        }
      });
    } catch (error) {
      console.error('Failed to fetch notification metrics:', error);
      toast.error('Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  };

  const extractSignalId = (message: string): string => {
    const match = message.match(/Signal.*?([a-f0-9-]{36})/);
    return match ? match[1] : 'unknown';
  };

  const extractEventKey = (message: string): string => {
    const match = message.match(/event_key.*?([a-zA-Z0-9_-]+)/);
    return match ? match[1] : 'unknown';
  };

  const cleanupDuplicates = async () => {
    try {
      const { error } = await supabase.functions.invoke('notification-cleanup');
      if (error) throw error;
      
      toast.success('Duplicate cleanup initiated');
      await fetchMetrics();
    } catch (error) {
      console.error('Cleanup failed:', error);
      toast.error('Cleanup failed');
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  useEffect(() => {
    // 🚨 ROUTE GATE: Only auto-refresh on dashboard/admin routes to prevent realtime message leak
    if (autoRefresh && shouldEnableMonitoring) {
      const interval = setInterval(fetchMetrics, 30000); // 30 seconds
      return () => clearInterval(interval);
    } else if (autoRefresh && !shouldEnableMonitoring) {
      console.log('🚫 NotificationDuplicateMonitor: Auto-refresh disabled on landing page routes');
      setAutoRefresh(false);
    }
  }, [autoRefresh, shouldEnableMonitoring]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Loading metrics...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) return null;

  const getStatusIcon = () => {
    switch (metrics.triggerHealth.healthStatus) {
      case 'healthy': return <CheckCircle className="h-5 w-5 text-emerald-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'critical': return <XCircle className="h-5 w-5 text-destructive" />;
    }
  };

  const getStatusBadge = () => {
    switch (metrics.triggerHealth.healthStatus) {
      case 'healthy': return <Badge variant="default" className="bg-emerald-100 text-emerald-800">Healthy</Badge>;
      case 'warning': return <Badge variant="destructive" className="bg-amber-100 text-amber-800">Warning</Badge>;
      case 'critical': return <Badge variant="destructive">Critical</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              Notification Duplicate Monitor
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={autoRefresh ? 'bg-primary/10' : ''}
              >
                <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                {autoRefresh ? 'Auto' : 'Manual'}
              </Button>
              <Button variant="outline" size="sm" onClick={fetchMetrics}>
                Refresh
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-foreground">{metrics.totalSent}</div>
              <div className="text-sm text-muted-foreground">Total Sent</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-destructive">{metrics.totalDuplicates}</div>
              <div className="text-sm text-muted-foreground">Duplicates</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-foreground">{metrics.duplicateRate}%</div>
              <div className="text-sm text-muted-foreground">Duplicate Rate</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-foreground">{metrics.triggerHealth.activeTriggers}</div>
              <div className="text-sm text-muted-foreground">Active Triggers</div>
            </div>
          </div>

          {/* Health Status */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <div className="font-semibold">System Status</div>
              <div className="text-sm text-muted-foreground">
                Notification duplicate prevention status
              </div>
            </div>
            {getStatusBadge()}
          </div>

          {/* Recent Duplicates */}
          {metrics.recentDuplicates.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Recent Duplicate Signals</h3>
                <Button
                  variant="outline" 
                  size="sm"
                  onClick={cleanupDuplicates}
                >
                  Clean Up
                </Button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {metrics.recentDuplicates.map((duplicate, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-muted rounded-lg text-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-xs text-muted-foreground truncate">
                        {duplicate.signal_id}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(duplicate.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                    <Badge variant="destructive" className="ml-2">
                      {duplicate.count}x
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          {metrics.triggerHealth.healthStatus !== 'healthy' && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <div className="font-semibold text-amber-800">Action Required</div>
                  <div className="text-sm text-amber-700 mt-1">
                    High duplicate rate detected. Consider running cleanup or checking trigger configuration.
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}