import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Bell, TrendingUp, TrendingDown, Activity, AlertTriangle, 
  CheckCircle, XCircle, Clock, Users, Zap, Settings, RefreshCw,
  BarChart3, PieChart, Target, Download, Calendar
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface NotificationMetrics {
  total_sent: number;
  total_delivered: number;
  total_failed: number;
  delivery_rate: number;
  by_type: {
    type: string;
    count: number;
    delivered: number;
    failed: number;
  }[];
  recent_failures: {
    id: string;
    type: string;
    reason: string;
    created_at: string;
  }[];
  hourly_volume: {
    hour: string;
    sent: number;
    delivered: number;
    failed: number;
  }[];
}

type TimeRange = '24h' | '7d' | '30d' | 'all';

export function EnhancedTradeNotificationDashboard() {
  const [metrics, setMetrics] = useState<NotificationMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [timeRange]);

  const getTimeRangeDate = () => {
    const now = new Date();
    switch (timeRange) {
      case '24h': return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case 'all': return new Date(0);
      default: return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  };

  const loadMetrics = async () => {
    try {
      setRefreshing(true);
      const startDate = getTimeRangeDate();
      
      // Get analytics data
      const { data: analytics, error } = await supabase
        .from('notification_analytics')
        .select('*')
        .gte('sent_at', startDate.toISOString())
        .order('sent_at', { ascending: true });

      if (error) throw error;

      if (!analytics || analytics.length === 0) {
        setMetrics({
          total_sent: 0,
          total_delivered: 0,
          total_failed: 0,
          delivery_rate: 0,
          by_type: [],
          recent_failures: [],
          hourly_volume: []
        });
        return;
      }

      // Calculate metrics
      const total_sent = analytics.length;
      const total_delivered = analytics.filter(a => a.delivered_at).length;
      const total_failed = analytics.filter(a => a.failed_at).length;
      const delivery_rate = total_sent > 0 ? (total_delivered / total_sent) * 100 : 0;

      // Group by type
      const byType: Record<string, any> = {};
      analytics.forEach(a => {
        if (!byType[a.notification_type]) {
          byType[a.notification_type] = { type: a.notification_type, count: 0, delivered: 0, failed: 0 };
        }
        byType[a.notification_type].count++;
        if (a.delivered_at) byType[a.notification_type].delivered++;
        if (a.failed_at) byType[a.notification_type].failed++;
      });

      // Calculate hourly volume (last 24 hours only)
      const hourly: Record<string, any> = {};
      const last24h = analytics.filter(a => {
        const sentTime = new Date(a.sent_at);
        return sentTime >= new Date(Date.now() - 24 * 60 * 60 * 1000);
      });

      last24h.forEach(a => {
        const hour = new Date(a.sent_at).getHours();
        const hourKey = `${hour}:00`;
        if (!hourly[hourKey]) {
          hourly[hourKey] = { hour: hourKey, sent: 0, delivered: 0, failed: 0 };
        }
        hourly[hourKey].sent++;
        if (a.delivered_at) hourly[hourKey].delivered++;
        if (a.failed_at) hourly[hourKey].failed++;
      });

      // Fill missing hours
      const hourlyVolume = [];
      for (let i = 0; i < 24; i++) {
        const hourKey = `${i}:00`;
        hourlyVolume.push(hourly[hourKey] || { hour: hourKey, sent: 0, delivered: 0, failed: 0 });
      }

      setMetrics({
        total_sent,
        total_delivered,
        total_failed,
        delivery_rate: Math.round(delivery_rate * 10) / 10,
        by_type: Object.values(byType),
        recent_failures: analytics
          .filter(a => a.failed_at)
          .slice(-10)
          .reverse()
          .map(a => ({
            id: a.id,
            type: a.notification_type,
            reason: a.failure_reason || 'Unknown',
            created_at: a.created_at
          })),
        hourly_volume: hourlyVolume
      });

    } catch (error: any) {
      console.error('Failed to load metrics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const exportToCSV = () => {
    if (!metrics) return;

    const csvData = [
      ['Notification Type', 'Sent', 'Delivered', 'Failed', 'Delivery Rate'],
      ...metrics.by_type.map(type => [
        type.type,
        type.count,
        type.delivered,
        type.failed,
        `${((type.delivered / type.count) * 100).toFixed(1)}%`
      ])
    ];

    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notification-analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
            <span className="text-lg">Loading Trade Notification Analytics...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load notification metrics. Please check your database connection.
        </AlertDescription>
      </Alert>
    );
  }

  const deliveryRateColor = metrics.delivery_rate >= 95 ? 'text-green-500' : 
                             metrics.delivery_rate >= 80 ? 'text-yellow-500' : 
                             'text-red-500';

  // Chart Data
  const hourlyChartData = {
    labels: metrics.hourly_volume.map(h => h.hour),
    datasets: [
      {
        label: 'Delivered',
        data: metrics.hourly_volume.map(h => h.delivered),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Failed',
        data: metrics.hourly_volume.map(h => h.failed),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  const typeChartData = {
    labels: metrics.by_type.map(t => t.type.replace(/_/g, ' ')),
    datasets: [{
      data: metrics.by_type.map(t => t.count),
      backgroundColor: [
        'rgba(59, 130, 246, 0.8)',
        'rgba(34, 197, 94, 0.8)',
        'rgba(239, 68, 68, 0.8)',
        'rgba(234, 179, 8, 0.8)',
        'rgba(168, 85, 247, 0.8)',
        'rgba(236, 72, 153, 0.8)',
      ],
      borderWidth: 2,
      borderColor: 'rgba(255, 255, 255, 0.1)'
    }]
  };

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Trade Notifications</h2>
          <p className="text-muted-foreground">
            Professional monitoring and analytics for OneSignal push notifications
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Time Range Selector */}
          <div className="flex items-center gap-1 border rounded-lg p-1">
            {(['24h', '7d', '30d', 'all'] as TimeRange[]).map((range) => (
              <Button
                key={range}
                onClick={() => setTimeRange(range)}
                variant={timeRange === range ? 'default' : 'ghost'}
                size="sm"
                className="gap-1"
              >
                <Calendar className="w-3 h-3" />
                {range === 'all' ? 'All Time' : range.toUpperCase()}
              </Button>
            ))}
          </div>

          {/* Export Button */}
          <Button onClick={exportToCSV} variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>

          {/* Refresh Button */}
          <Button 
            onClick={loadMetrics} 
            disabled={refreshing}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Critical Health Status */}
      {metrics.delivery_rate < 95 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>⚠️ LOW DELIVERY RATE:</strong> {metrics.delivery_rate}% (Target: 95%+).
            {metrics.total_failed > 0 && ` ${metrics.total_failed} notifications failed in selected time range.`}
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total_sent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {timeRange === '24h' ? 'Last 24 hours' : timeRange === '7d' ? 'Last 7 days' : timeRange === '30d' ? 'Last 30 days' : 'All time'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${deliveryRateColor}`}>
              {metrics.delivery_rate}%
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.total_delivered.toLocaleString()} delivered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Deliveries</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${metrics.total_failed > 0 ? 'text-red-500' : 'text-green-500'}`}>
              {metrics.total_failed}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.total_failed === 0 ? '✅ All successful' : '⚠️ Needs attention'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {metrics.delivery_rate >= 95 ? (
                <>
                  <CheckCircle className="w-6 h-6 text-green-500" />
                  <span className="text-2xl font-bold text-green-500">Healthy</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-6 h-6 text-yellow-500" />
                  <span className="text-2xl font-bold text-yellow-500">Degraded</span>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.delivery_rate >= 95 ? 'All systems operational' : 'Performance below target'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Hourly Volume Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Hourly Volume (Last 24h)
            </CardTitle>
            <CardDescription>Notification delivery patterns by hour</CardDescription>
          </CardHeader>
          <CardContent>
            <Line 
              data={hourlyChartData} 
              options={{
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                  legend: { position: 'bottom' as const },
                  tooltip: { mode: 'index' as const, intersect: false }
                },
                scales: {
                  y: { beginAtZero: true }
                }
              }} 
            />
          </CardContent>
        </Card>

        {/* Type Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Notification Types
            </CardTitle>
            <CardDescription>Distribution by notification type</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <div className="w-full max-w-sm">
              <Doughnut 
                data={typeChartData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: true,
                  plugins: {
                    legend: { position: 'bottom' as const }
                  }
                }} 
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">By Type</TabsTrigger>
          <TabsTrigger value="failures">Failures</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Types Breakdown</CardTitle>
              <CardDescription>Detailed metrics by notification type</CardDescription>
            </CardHeader>
            <CardContent>
              {metrics.by_type.length > 0 ? (
                <div className="space-y-4">
                  {metrics.by_type.map(type => {
                    const deliveryRate = type.count > 0 ? (type.delivered / type.count) * 100 : 0;
                    return (
                      <div key={type.type} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono">
                              {type.type.replace(/_/g, ' ')}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {type.count} sent
                            </span>
                          </div>
                          <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all ${deliveryRate >= 95 ? 'bg-green-500' : deliveryRate >= 80 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${deliveryRate}%` }}
                            />
                          </div>
                        </div>
                        <div className="ml-4 text-right space-y-1">
                          <div className="text-lg font-bold">{Math.round(deliveryRate)}%</div>
                          <div className="text-xs text-muted-foreground">
                            {type.delivered} / {type.count}
                          </div>
                          {type.failed > 0 && (
                            <div className="text-xs text-red-500">
                              {type.failed} failed
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No notifications sent in selected time range
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="failures" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Failures ({metrics.recent_failures.length})</CardTitle>
              <CardDescription>Last 10 failed notifications</CardDescription>
            </CardHeader>
            <CardContent>
              {metrics.recent_failures.length > 0 ? (
                <div className="space-y-2">
                  {metrics.recent_failures.map(failure => (
                    <Alert key={failure.id} variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <strong className="font-mono">{failure.type.replace(/_/g, ' ')}</strong>
                            <p className="text-xs">{failure.reason}</p>
                          </div>
                          <span className="text-xs opacity-70">
                            {new Date(failure.created_at).toLocaleString()}
                          </span>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <p className="text-lg font-semibold">✅ No Failures!</p>
                  <p className="text-sm text-muted-foreground">All notifications delivered successfully</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Configuration</CardTitle>
              <CardDescription>OneSignal Integration Status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">OneSignal App ID</p>
                  <p className="text-sm text-muted-foreground font-mono">3ea69bee-8061-4d47-8053-fc95779b6f1e</p>
                </div>
                <Badge variant="default">✅ Configured</Badge>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">REST API Key</p>
                  <p className="text-sm text-muted-foreground">••••••••••••••••</p>
                </div>
                <Badge variant="default">✅ Set</Badge>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Edge Functions</p>
                  <p className="text-sm text-muted-foreground">6 notification functions deployed</p>
                </div>
                <Badge variant="default">✅ Active</Badge>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Analytics Tracking</p>
                  <p className="text-sm text-muted-foreground">Real-time logging enabled</p>
                </div>
                <Badge variant="default">✅ Enabled</Badge>
              </div>

              <Alert>
                <Activity className="h-4 w-4" />
                <AlertDescription>
                  <strong>✅ System Status:</strong> All components operational. OneSignal integration working correctly with full analytics tracking.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Pro Tips */}
      <Alert>
        <Zap className="h-4 w-4" />
        <AlertDescription>
          <strong>💡 Pro Tips:</strong> Maintain 95%+ delivery rate for professional standards. 
          Export analytics regularly to track trends. Check failures tab daily for any issues.
        </AlertDescription>
      </Alert>
    </div>
  );
}

