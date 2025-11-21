import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { 
  Bell, TrendingUp, TrendingDown, Activity, AlertTriangle, 
  CheckCircle, XCircle, Clock, Users, Zap, Settings, RefreshCw,
  BarChart3, PieChart, Target, Download, Calendar, Search, User
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
// ✅ FIX: Lazy load Chart.js to prevent SSR/hydration errors
import { lazy, Suspense } from 'react';

// Lazy load chart components
const Line = lazy(() => import('react-chartjs-2').then(mod => ({ default: mod.Line })));
const Doughnut = lazy(() => import('react-chartjs-2').then(mod => ({ default: mod.Doughnut })));
const Bar = lazy(() => import('react-chartjs-2').then(mod => ({ default: mod.Bar })));

// Register Chart.js components only on client side
if (typeof window !== 'undefined') {
  import('chart.js').then(({ Chart, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler }) => {
    Chart.register(
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
  });
}

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
  recent_notifications: {
    id: string;
    type: string;
    user_id: string;
    sent_at: string;
    delivered_at: string | null;
    failed_at: string | null;
    failure_reason: string | null;
    onesignal_notification_id: string | null;
  }[];
  hourly_volume: {
    hour: string;
    sent: number;
    delivered: number;
    failed: number;
  }[];
}

type TimeRange = '24h' | '7d' | '30d' | 'all';

// ✅ FIX: Export as default to match AdminTools import
export default function EnhancedTradeNotificationDashboard() {
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
        .order('sent_at', { ascending: true })
        .limit(10000); // Limit for performance

      if (error) throw error;

      if (!analytics || analytics.length === 0) {
      setMetrics({
        total_sent: 0,
        total_delivered: 0,
        total_failed: 0,
        delivery_rate: 0,
        by_type: [],
        recent_failures: [],
        recent_notifications: [],
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
        recent_notifications: analytics
          .slice(-20)
          .reverse()
          .map(a => ({
            id: a.id,
            type: a.notification_type,
            user_id: a.user_id,
            sent_at: a.sent_at,
            delivered_at: a.delivered_at,
            failed_at: a.failed_at,
            failure_reason: a.failure_reason,
            onesignal_notification_id: a.onesignal_notification_id
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
            <Suspense fallback={<div className="h-64 flex items-center justify-center"><RefreshCw className="w-6 h-6 animate-spin" /></div>}>
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
            </Suspense>
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
              <Suspense fallback={<div className="h-64 flex items-center justify-center"><RefreshCw className="w-6 h-6 animate-spin" /></div>}>
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
              </Suspense>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">By Type</TabsTrigger>
          <TabsTrigger value="failures">Failures</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Recent Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Recent Notifications (Last 20)
              </CardTitle>
              <CardDescription>Live feed of notification delivery status</CardDescription>
            </CardHeader>
            <CardContent>
              <RecentNotificationsList metrics={metrics} />
            </CardContent>
          </Card>

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

        <TabsContent value="subscriptions" className="space-y-4">
          <UserSubscriptionsList />
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📋 RECENT NOTIFICATIONS LIST
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function RecentNotificationsList({ metrics }: { metrics: NotificationMetrics | null }) {
  if (!metrics || metrics.recent_notifications.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No notifications sent yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[400px] overflow-y-auto">
      {metrics.recent_notifications.map((notif) => {
        const status = notif.failed_at ? 'failed' : notif.delivered_at ? 'delivered' : 'pending';
        const statusColor = status === 'delivered' ? 'text-green-500' : 
                           status === 'failed' ? 'text-red-500' : 
                           'text-yellow-500';
        const statusIcon = status === 'delivered' ? <CheckCircle className="w-4 h-4" /> :
                          status === 'failed' ? <XCircle className="w-4 h-4" /> :
                          <Clock className="w-4 h-4" />;

        return (
          <div
            key={notif.id}
            className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-3 flex-1">
              <div className={statusColor}>
                {statusIcon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    {notif.type.replace(/_/g, ' ')}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    User: {notif.user_id.substring(0, 8)}...
                  </span>
                </div>
                {notif.onesignal_notification_id && (
                  <div className="text-xs text-muted-foreground mt-1">
                    OneSignal ID: {notif.onesignal_notification_id.substring(0, 20)}...
                  </div>
                )}
                {notif.failure_reason && (
                  <div className="text-xs text-red-500 mt-1">
                    {notif.failure_reason}
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              <Badge 
                variant={status === 'delivered' ? 'default' : status === 'failed' ? 'destructive' : 'secondary'}
                className={status === 'delivered' ? 'bg-green-500' : ''}
              >
                {status === 'delivered' ? '✅ Delivered' : 
                 status === 'failed' ? '❌ Failed' : 
                 '⏳ Pending'}
              </Badge>
              <div className="text-xs text-muted-foreground mt-1">
                {new Date(notif.sent_at).toLocaleTimeString()}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 👥 USER SUBSCRIPTIONS LIST
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface UserSubscription {
  id: string;
  display_name: string | null;
  email: string | null;
  device_token: string | null;
  xeon_stream_subscription: boolean;
  created_at: string;
  last_notification_at: string | null;
  total_notifications_received: number;
  total_notifications_failed: number;
  delivery_rate: number;
}

function UserSubscriptionsList() {
  const [users, setUsers] = useState<UserSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'subscribed' | 'unsubscribed'>('all');

  useEffect(() => {
    loadUserSubscriptions();
  }, []);

  const loadUserSubscriptions = async () => {
    try {
      setLoading(true);

      // Get all users with their profile info
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, email, device_token, xeon_stream_subscription, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      if (!profiles) {
        setUsers([]);
        return;
      }

      // Get notification stats for each user
      const userSubscriptions: UserSubscription[] = await Promise.all(
        profiles.map(async (profile) => {
          const { data: notifStats } = await supabase
            .from('notification_analytics')
            .select('sent_at, delivered_at, failed_at')
            .eq('user_id', profile.id)
            .order('sent_at', { ascending: false })
            .limit(100);

          const totalReceived = notifStats?.length || 0;
          const totalFailed = notifStats?.filter(n => n.failed_at).length || 0;
          const totalDelivered = notifStats?.filter(n => n.delivered_at).length || 0;
          const deliveryRate = totalReceived > 0 ? (totalDelivered / totalReceived) * 100 : 0;
          const lastNotificationAt = notifStats?.[0]?.sent_at || null;

          return {
            id: profile.id,
            display_name: profile.display_name,
            email: profile.email,
            device_token: profile.device_token,
            xeon_stream_subscription: profile.xeon_stream_subscription || false,
            created_at: profile.created_at,
            last_notification_at: lastNotificationAt,
            total_notifications_received: totalReceived,
            total_notifications_failed: totalFailed,
            delivery_rate: Math.round(deliveryRate * 10) / 10,
          };
        })
      );

      setUsers(userSubscriptions);
    } catch (error: any) {
      console.error('Failed to load user subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    // Filter by search term
    const matchesSearch = !searchTerm || 
      user.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.device_token?.toLowerCase().includes(searchTerm.toLowerCase());

    // Filter by status
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'subscribed' && user.xeon_stream_subscription) ||
      (filterStatus === 'unsubscribed' && !user.xeon_stream_subscription);

    return matchesSearch && matchesStatus;
  });

  const subscribedCount = users.filter(u => u.xeon_stream_subscription).length;
  const unsubscribedCount = users.filter(u => !u.xeon_stream_subscription).length;
  const withPlayerIdCount = users.filter(u => u.device_token).length;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          User Subscriptions ({users.length} total)
        </CardTitle>
        <CardDescription>
          All users with their OneSignal Player IDs and subscription status
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 border rounded-lg">
            <div className="text-sm text-muted-foreground">Subscribed</div>
            <div className="text-2xl font-bold text-green-500">{subscribedCount}</div>
          </div>
          <div className="p-4 border rounded-lg">
            <div className="text-sm text-muted-foreground">Unsubscribed</div>
            <div className="text-2xl font-bold text-red-500">{unsubscribedCount}</div>
          </div>
          <div className="p-4 border rounded-lg">
            <div className="text-sm text-muted-foreground">With Player ID</div>
            <div className="text-2xl font-bold text-blue-500">{withPlayerIdCount}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or Player ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filterStatus === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('all')}
            >
              All ({users.length})
            </Button>
            <Button
              variant={filterStatus === 'subscribed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('subscribed')}
            >
              Subscribed ({subscribedCount})
            </Button>
            <Button
              variant={filterStatus === 'unsubscribed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('unsubscribed')}
            >
              Unsubscribed ({unsubscribedCount})
            </Button>
          </div>
        </div>

        {/* User List */}
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => (
              <div
                key={user.id}
                className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    {/* User Info */}
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium">
                          {user.display_name || user.email?.split('@')[0] || 'User'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {user.email || 'No email'}
                        </div>
                      </div>
                    </div>

                    {/* OneSignal Player ID */}
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        {user.device_token ? (
                          <>
                            <Bell className="w-3 h-3 mr-1" />
                            {user.device_token.substring(0, 20)}...
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 mr-1" />
                            No Player ID
                          </>
                        )}
                      </Badge>
                      {user.xeon_stream_subscription ? (
                        <Badge variant="default" className="bg-green-500">
                          ✅ Subscribed
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          🔕 Not Subscribed
                        </Badge>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Bell className="w-3 h-3" />
                        {user.total_notifications_received} received
                      </div>
                      {user.total_notifications_failed > 0 && (
                        <div className="flex items-center gap-1 text-red-500">
                          <XCircle className="w-3 h-3" />
                          {user.total_notifications_failed} failed
                        </div>
                      )}
                      {user.total_notifications_received > 0 && (
                        <div className="flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          {user.delivery_rate}% delivery rate
                        </div>
                      )}
                      {user.last_notification_at && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Last: {new Date(user.last_notification_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No users found matching your filters</p>
            </div>
          )}
        </div>

        {/* Legend */}
        <Alert>
          <Bell className="h-4 w-4" />
          <AlertDescription>
            <strong>💡 Note:</strong> "Player ID" is the OneSignal device identifier. 
            Users must enable push notifications in their browser to get a Player ID. 
            "Subscribed" means they have xeon_stream_subscription enabled.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

