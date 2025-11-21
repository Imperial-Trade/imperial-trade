import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  RefreshCw,
  BarChart3,
  Users,
  Bell
} from 'lucide-react';
import { notificationReliabilityService } from '@/services/NotificationReliabilityService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface AnalyticsData {
  daily: Array<{ date: string; sent: number; delivered: number; failed: number; rate: number }>;
  channels: Record<string, { sent: number; delivered: number; failed: number }>;
  types: Record<string, { sent: number; delivered: number; failed: number }>;
}

interface SystemHealth {
  totalUsers: number;
  activeSubscriptions: number;
  recentFailures: number;
  avgResponseTime: number;
}

export function NotificationAnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(7);

  useEffect(() => {
    loadAnalytics();
    loadSystemHealth();
  }, [selectedPeriod]);

  const loadAnalytics = async () => {
    try {
      const data = await notificationReliabilityService.getNotificationAnalytics(selectedPeriod);
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      toast({
        title: "Analytics Error",
        description: "Failed to load notification analytics",
        variant: "destructive"
      });
    }
  };

  const loadSystemHealth = async () => {
    try {
      setIsLoading(true);
      
      // Get system health metrics
      const [usersResult, subscriptionsResult, auditResult] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('xeon_stream_subscription', true), // ✅ FIX: Changed from push_subscription_active
        supabase
          .from('notification_delivery_log')
          .select('*')
          .eq('status', 'failed')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      ]);

      const totalUsers = usersResult.count || 0;
      const activeSubscriptions = subscriptionsResult.count || 0;
      const recentFailures = auditResult.data?.length || 0;

      // Calculate average response time from recent deliveries
      const { data: recentDeliveries } = await supabase
        .from('notification_delivery_log')
        .select('created_at, delivered_at')
        .not('delivered_at', 'is', null)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .limit(100);

      const avgResponseTime = recentDeliveries?.length ? 
        recentDeliveries.reduce((sum, record) => {
          const created = new Date(record.created_at).getTime();
          const delivered = new Date(record.delivered_at!).getTime();
          return sum + (delivered - created);
        }, 0) / recentDeliveries.length / 1000 : 0; // Convert to seconds

      setSystemHealth({
        totalUsers,
        activeSubscriptions,
        recentFailures,
        avgResponseTime
      });
    } catch (error) {
      console.error('Failed to load system health:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = () => {
    loadAnalytics();
    loadSystemHealth();
  };

  const formatChannelData = (channels: Record<string, any>) => {
    return Object.entries(channels).map(([channel, data]) => ({
      name: channel.charAt(0).toUpperCase() + channel.slice(1),
      sent: data.sent,
      delivered: data.delivered,
      failed: data.failed,
      rate: data.sent > 0 ? ((data.delivered / data.sent) * 100).toFixed(1) : '0'
    }));
  };

  const formatTypeData = (types: Record<string, any>) => {
    return Object.entries(types).map(([type, data]) => ({
      name: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: data.sent
    }));
  };

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00'];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 bg-muted rounded w-64 animate-pulse" />
          <div className="h-10 bg-muted rounded w-32 animate-pulse" />
        </div>
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardHeader>
              <div className="h-6 bg-muted rounded w-48 animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const overallDeliveryRate = analytics?.daily.reduce((sum, day) => sum + day.rate, 0) / (analytics?.daily.length || 1) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notification Analytics</h1>
          <p className="text-muted-foreground">Monitor system performance and delivery metrics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refreshData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemHealth?.totalUsers || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemHealth?.activeSubscriptions || 0}</div>
            <p className="text-xs text-muted-foreground">
              {systemHealth?.totalUsers ? 
                `${((systemHealth.activeSubscriptions / systemHealth.totalUsers) * 100).toFixed(1)}% of users` : 
                'No data'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
            {overallDeliveryRate >= 90 ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : overallDeliveryRate >= 70 ? (
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallDeliveryRate.toFixed(1)}%</div>
            <Progress value={overallDeliveryRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemHealth?.avgResponseTime ? `${systemHealth.avgResponseTime.toFixed(1)}s` : 'N/A'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2">
        {[7, 14, 30].map(days => (
          <Button
            key={days}
            variant={selectedPeriod === days ? "default" : "outline"}
            onClick={() => setSelectedPeriod(days)}
          >
            {days} days
          </Button>
        ))}
      </div>

      <Tabs defaultValue="delivery" className="space-y-6">
        <TabsList>
          <TabsTrigger value="delivery">Delivery Trends</TabsTrigger>
          <TabsTrigger value="channels">By Channel</TabsTrigger>
          <TabsTrigger value="types">By Type</TabsTrigger>
        </TabsList>

        <TabsContent value="delivery" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Daily Delivery Performance</CardTitle>
              <CardDescription>
                Notification delivery rates over the last {selectedPeriod} days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={analytics?.daily || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="rate" stroke="#8884d8" name="Delivery Rate %" />
                  <Line type="monotone" dataKey="sent" stroke="#82ca9d" name="Sent" />
                  <Line type="monotone" dataKey="delivered" stroke="#ffc658" name="Delivered" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="channels" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance by Channel</CardTitle>
              <CardDescription>
                Delivery performance across different notification channels
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={formatChannelData(analytics?.channels || {})}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="sent" fill="#8884d8" name="Sent" />
                  <Bar dataKey="delivered" fill="#82ca9d" name="Delivered" />
                  <Bar dataKey="failed" fill="#ff7300" name="Failed" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="types" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Distribution by Type</CardTitle>
              <CardDescription>
                Breakdown of notifications by type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={formatTypeData(analytics?.types || {})}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {formatTypeData(analytics?.types || {}).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}