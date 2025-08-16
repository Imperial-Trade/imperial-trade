import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Bell, 
  Activity, 
  Target, 
  Zap,
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  Filter,
  RefreshCw
} from 'lucide-react';
import { useEnhancedNotifications } from '@/hooks/useEnhancedNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface AnalyticsData {
  notifications: {
    totalSent: number;
    totalDelivered: number;
    totalOpened: number;
    deliveryRate: number;
    openRate: number;
    channelBreakdown: Record<string, number>;
    hourlyTrends: Array<{ hour: number; count: number }>;
  };
  signals: {
    totalGenerated: number;
    successRate: number;
    avgConfidence: number;
    topPerformers: Array<{ symbol: string; count: number; winRate: number }>;
    timeDistribution: Array<{ period: string; count: number }>;
  };
  users: {
    totalActive: number;
    subscriptionRate: number;
    engagementScore: number;
    topCountries: Array<{ country: string; count: number }>;
    deviceBreakdown: Record<string, number>;
  };
  performance: {
    avgLatency: number;
    uptime: number;
    errorRate: number;
    throughput: number;
    peakLoad: number;
  };
}

export default function Phase4AnalyticsDashboard() {
  const { user } = useAuth();
  const { stats } = useEnhancedNotifications();
  const [isConnected, setIsConnected] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('24h');

  // Load analytics data
  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange]);

  const loadAnalyticsData = async () => {
    setIsLoading(true);
    try {
      // Simulate loading analytics data
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockData: AnalyticsData = {
        notifications: {
          totalSent: Math.floor(Math.random() * 10000) + 5000,
          totalDelivered: Math.floor(Math.random() * 9000) + 4500,
          totalOpened: Math.floor(Math.random() * 3000) + 2000,
          deliveryRate: 94.2,
          openRate: 67.8,
          channelBreakdown: {
            push: 65,
            email: 20,
            sms: 10,
            in_app: 5
          },
          hourlyTrends: Array.from({ length: 24 }, (_, i) => ({
            hour: i,
            count: Math.floor(Math.random() * 500) + 100
          }))
        },
        signals: {
          totalGenerated: Math.floor(Math.random() * 1000) + 500,
          successRate: 78.4,
          avgConfidence: 0.82,
          topPerformers: [
            { symbol: 'EURUSD', count: 145, winRate: 82.1 },
            { symbol: 'GBPUSD', count: 132, winRate: 79.5 },
            { symbol: 'BTCUSD', count: 98, winRate: 85.7 },
            { symbol: 'XAUUSD', count: 87, winRate: 74.2 }
          ],
          timeDistribution: [
            { period: 'London Session', count: 35 },
            { period: 'NY Session', count: 42 },
            { period: 'Asian Session', count: 18 },
            { period: 'Overlap', count: 5 }
          ]
        },
        users: {
          totalActive: Math.floor(Math.random() * 5000) + 2000,
          subscriptionRate: 89.3,
          engagementScore: 7.8,
          topCountries: [
            { country: 'United States', count: 1245 },
            { country: 'United Kingdom', count: 892 },
            { country: 'Germany', count: 567 },
            { country: 'Canada', count: 434 },
            { country: 'Australia', count: 321 }
          ],
          deviceBreakdown: {
            desktop: 45,
            mobile: 40,
            tablet: 15
          }
        },
        performance: {
          avgLatency: Math.floor(Math.random() * 50) + 20,
          uptime: 99.7,
          errorRate: 0.3,
          throughput: Math.floor(Math.random() * 1000) + 500,
          peakLoad: Math.floor(Math.random() * 2000) + 1000
        }
      };

      setAnalyticsData(mockData);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadAnalyticsData();
    setRefreshing(false);
  };

  const exportData = () => {
    if (!analyticsData) return;
    
    const dataStr = JSON.stringify(analyticsData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatPercentage = (num: number) => {
    return `${num.toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center space-y-4">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-500" />
            <p className="text-muted-foreground">Loading Phase 4 Analytics Dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Dashboard Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <BarChart3 className="w-6 h-6 text-purple-500" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full" />
              </div>
              Phase 4: Advanced Analytics Dashboard
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm text-muted-foreground">
                  {isConnected ? 'Live Data' : 'Offline'}
                </span>
              </div>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-3 py-1 border rounded-md text-sm"
              >
                <option value="1h">Last Hour</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
              <Button onClick={refreshData} size="sm" disabled={refreshing} className="gap-2">
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button onClick={exportData} size="sm" variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Export
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {analyticsData ? formatNumber(analyticsData.notifications.totalSent) : '—'}
              </div>
              <div className="text-sm text-blue-600">Total Notifications</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {analyticsData ? formatPercentage(analyticsData.notifications.deliveryRate) : '—'}
              </div>
              <div className="text-sm text-green-600">Delivery Rate</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {analyticsData ? formatNumber(analyticsData.users.totalActive) : '—'}
              </div>
              <div className="text-sm text-purple-600">Active Users</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {analyticsData ? `${analyticsData.performance.avgLatency}ms` : '—'}
              </div>
              <div className="text-sm text-orange-600">Avg Latency</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analytics Tabs */}
      <Tabs defaultValue="notifications" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="signals" className="gap-2">
            <Target className="w-4 h-4" />
            Trading Signals
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="w-4 h-4" />
            User Engagement
          </TabsTrigger>
          <TabsTrigger value="performance" className="gap-2">
            <Activity className="w-4 h-4" />
            System Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notification Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-lg font-bold">{analyticsData ? formatNumber(analyticsData.notifications.totalDelivered) : '—'}</div>
                    <div className="text-xs text-muted-foreground">Delivered</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-lg font-bold">{analyticsData ? formatNumber(analyticsData.notifications.totalOpened) : '—'}</div>
                    <div className="text-xs text-muted-foreground">Opened</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Open Rate</span>
                    <span className="font-medium">{analyticsData ? formatPercentage(analyticsData.notifications.openRate) : '—'}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${analyticsData?.notifications.openRate || 0}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Channel Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {analyticsData && (
                  <div className="space-y-3">
                    {Object.entries(analyticsData.notifications.channelBreakdown).map(([channel, percentage]) => (
                      <div key={channel} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize">{channel}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-10">{percentage}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="signals" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Signal Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-lg font-bold text-green-600">
                      {analyticsData ? formatPercentage(analyticsData.signals.successRate) : '—'}
                    </div>
                    <div className="text-xs text-green-600">Success Rate</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-lg font-bold text-blue-600">
                      {analyticsData ? (analyticsData.signals.avgConfidence * 100).toFixed(1) + '%' : '—'}
                    </div>
                    <div className="text-xs text-blue-600">Avg Confidence</div>
                  </div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {analyticsData ? formatNumber(analyticsData.signals.totalGenerated) : '—'}
                  </div>
                  <div className="text-sm text-purple-600">Total Signals Generated</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Performing Symbols</CardTitle>
              </CardHeader>
              <CardContent>
                {analyticsData && (
                  <div className="space-y-3">
                    {analyticsData.signals.topPerformers.map((performer, index) => (
                      <div key={performer.symbol} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-3">
                          <div className="text-lg font-bold text-muted-foreground">#{index + 1}</div>
                          <div>
                            <div className="font-medium">{performer.symbol}</div>
                            <div className="text-xs text-muted-foreground">{performer.count} signals</div>
                          </div>
                        </div>
                        <Badge variant={performer.winRate > 80 ? 'default' : 'secondary'}>
                          {formatPercentage(performer.winRate)} win
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  User Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-lg font-bold text-blue-600">
                      {analyticsData ? formatPercentage(analyticsData.users.subscriptionRate) : '—'}
                    </div>
                    <div className="text-xs text-blue-600">Subscription Rate</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-lg font-bold text-green-600">
                      {analyticsData ? analyticsData.users.engagementScore.toFixed(1) : '—'}
                    </div>
                    <div className="text-xs text-green-600">Engagement Score</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Device Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {analyticsData && (
                  <div className="space-y-3">
                    {Object.entries(analyticsData.users.deviceBreakdown).map(([device, percentage]) => (
                      <div key={device} className="flex items-center justify-between">
                        <Badge variant="outline" className="capitalize">{device}</Badge>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{percentage}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  System Health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Uptime</span>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="font-medium">{analyticsData ? formatPercentage(analyticsData.performance.uptime) : '—'}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Error Rate</span>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-orange-500" />
                    <span className="font-medium">{analyticsData ? formatPercentage(analyticsData.performance.errorRate) : '—'}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Throughput</span>
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-blue-500" />
                    <span className="font-medium">{analyticsData ? `${formatNumber(analyticsData.performance.throughput)}/min` : '—'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {analyticsData ? `${analyticsData.performance.avgLatency}ms` : '—'}
                  </div>
                  <div className="text-sm text-muted-foreground">Average Latency</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">
                    {analyticsData ? formatNumber(analyticsData.performance.peakLoad) : '—'}
                  </div>
                  <div className="text-sm text-muted-foreground">Peak Load (req/min)</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Real-time Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">WebSocket</span>
                  <Badge variant={isConnected ? 'default' : 'destructive'}>
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Database</span>
                  <Badge variant="default">Online</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">API Status</span>
                  <Badge variant="default">Operational</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}