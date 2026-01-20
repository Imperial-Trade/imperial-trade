import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Bell, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Users, 
  Zap, 
  RefreshCw,
  BarChart3, 
  Target, 
  Download, 
  Calendar, 
  Search, 
  User,
  ChevronDown,
  SlidersHorizontal,
  X,
  Loader2,
  Send,
  Smartphone,
  Wifi,
  WifiOff,
  Eye,
  Settings,
  MoreVertical
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Line, Doughnut } from 'react-chartjs-2';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

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
type TabType = 'overview' | 'types' | 'failures' | 'subscriptions';

export default function EnhancedTradeNotificationDashboard() {
  const [metrics, setMetrics] = useState<NotificationMetrics | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [expandedNotification, setExpandedNotification] = useState<string | null>(null);
  const [loadingPhase, setLoadingPhase] = useState<'loading' | 'transitioning' | 'complete'>('loading');

  // Loading phase: 1s loading, then 0.5s transition
  useEffect(() => {
    const loadingTimer = setTimeout(() => {
      setLoadingPhase('transitioning');
    }, 1000);
    
    const transitionTimer = setTimeout(() => {
      setLoadingPhase('complete');
    }, 1500);
    
    return () => {
      clearTimeout(loadingTimer);
      clearTimeout(transitionTimer);
    };
  }, []);

  const loading = dataLoading || loadingPhase === 'loading';
  const isTransitioning = loadingPhase === 'transitioning';

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 30000);
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
      
      type AnalyticsRecord = {
        id: string;
        notification_type: string;
        user_id: string | null;
        sent_at: string | null;
        delivered_at: string | null;
        failed_at: string | null;
        failure_reason: string | null;
        onesignal_notification_id: string | null;
        created_at: string | null;
      };
      
      const { data, error } = await supabase
        .from('notification_analytics')
        .select('id, notification_type, user_id, sent_at, delivered_at, failed_at, failure_reason, onesignal_notification_id, created_at')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true })
        .limit(10000);

      if (error) throw error;

      const analytics = (data || []) as AnalyticsRecord[];

      if (analytics.length === 0) {
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

      const total_sent = analytics.length;
      const total_delivered = analytics.filter(a => a.delivered_at).length;
      const total_failed = analytics.filter(a => a.failed_at).length;
      const delivery_rate = total_sent > 0 ? (total_delivered / total_sent) * 100 : 0;

      const byType: Record<string, any> = {};
      analytics.forEach(a => {
        if (!byType[a.notification_type]) {
          byType[a.notification_type] = { type: a.notification_type, count: 0, delivered: 0, failed: 0 };
        }
        byType[a.notification_type].count++;
        if (a.delivered_at) byType[a.notification_type].delivered++;
        if (a.failed_at) byType[a.notification_type].failed++;
      });

      const hourly: Record<string, any> = {};
      const last24h = analytics.filter(a => {
        const timeStr = a.sent_at || a.created_at;
        if (!timeStr) return false;
        const sentTime = new Date(timeStr);
        return sentTime >= new Date(Date.now() - 24 * 60 * 60 * 1000);
      });

      last24h.forEach(a => {
        const timeStr = a.sent_at || a.created_at;
        if (!timeStr) return;
        const hour = new Date(timeStr).getHours();
        const hourKey = `${hour}:00`;
        if (!hourly[hourKey]) {
          hourly[hourKey] = { hour: hourKey, sent: 0, delivered: 0, failed: 0 };
        }
        hourly[hourKey].sent++;
        if (a.delivered_at) hourly[hourKey].delivered++;
        if (a.failed_at) hourly[hourKey].failed++;
      });

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
            created_at: a.created_at || ''
          })),
        recent_notifications: analytics
          .slice(-20)
          .reverse()
          .map(a => ({
            id: a.id,
            type: a.notification_type,
            user_id: a.user_id || '',
            sent_at: a.sent_at || '',
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
      setDataLoading(false);
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

  const getStatusConfig = (status: 'delivered' | 'failed' | 'pending') => {
    switch (status) {
      case 'delivered':
        return { 
          icon: CheckCircle, 
          label: 'Delivered', 
          bg: 'bg-emerald-50 dark:bg-emerald-500/10', 
          text: 'text-emerald-600 dark:text-emerald-400',
          border: 'border-emerald-200 dark:border-emerald-500/20'
        };
      case 'failed':
        return { 
          icon: XCircle, 
          label: 'Failed', 
          bg: 'bg-red-50 dark:bg-red-500/10', 
          text: 'text-red-600 dark:text-red-400',
          border: 'border-red-200 dark:border-red-500/20'
        };
      case 'pending':
        return { 
          icon: Clock, 
          label: 'Pending', 
          bg: 'bg-amber-50 dark:bg-amber-500/10', 
          text: 'text-amber-600 dark:text-amber-400',
          border: 'border-amber-200 dark:border-amber-500/20'
        };
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Bell className="w-8 h-8 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center shadow-md">
              <Loader2 className="w-4 h-4 text-violet-500 animate-spin" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-base font-medium text-slate-900 dark:text-white">Loading Analytics</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Please wait...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="w-full min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Failed to Load</h3>
          <p className="text-slate-500 dark:text-slate-400">Please check your database connection.</p>
        </div>
      </div>
    );
  }

  const deliveryRateColor = metrics.delivery_rate >= 95 ? 'text-emerald-600 dark:text-emerald-400' : 
                           metrics.delivery_rate >= 80 ? 'text-amber-600 dark:text-amber-400' : 
                           'text-red-600 dark:text-red-400';

  const systemHealthy = metrics.delivery_rate >= 95;

  // Chart configurations
  const hourlyChartData = {
    labels: metrics.hourly_volume.map(h => h.hour),
    datasets: [
      {
        label: 'Delivered',
        data: metrics.hourly_volume.map(h => h.delivered),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
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
        'rgba(139, 92, 246, 0.8)',
        'rgba(16, 185, 129, 0.8)',
        'rgba(239, 68, 68, 0.8)',
        'rgba(245, 158, 11, 0.8)',
        'rgba(59, 130, 246, 0.8)',
        'rgba(236, 72, 153, 0.8)',
      ],
      borderWidth: 0
    }]
  };

  const tabs: { value: TabType; label: string; count?: number }[] = [
    { value: 'overview', label: 'Overview' },
    { value: 'types', label: 'By Type', count: metrics.by_type.length },
    { value: 'failures', label: 'Failures', count: metrics.recent_failures.length },
    { value: 'subscriptions', label: 'Users' },
  ];

  return (
    <div 
      className={`w-full pb-24 lg:pb-6 transition-all duration-500 ${
        isTransitioning ? 'blur-sm opacity-90' : 'blur-0 opacity-100'
      }`}
    >
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4 lg:mb-6">
          <div className="flex items-center gap-3 lg:gap-4">
            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Bell className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg lg:text-2xl font-bold text-slate-900 dark:text-white">Notifications</h1>
              <p className="text-xs lg:text-sm text-slate-500 dark:text-slate-400">
                {metrics.total_sent} sent • {timeRange === '24h' ? 'Last 24h' : timeRange === '7d' ? 'Last 7 days' : timeRange === '30d' ? 'Last 30 days' : 'All time'}
              </p>
            </div>
          </div>
          
          {/* Mobile Actions */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              onClick={() => setIsFilterOpen(true)}
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
            <button
              onClick={loadMetrics}
              disabled={refreshing}
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Time Range */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              {(['24h', '7d', '30d', 'all'] as TimeRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    timeRange === range
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {range === 'all' ? 'All' : range.toUpperCase()}
                </button>
              ))}
            </div>
            
            <Button onClick={exportToCSV} variant="outline" size="sm" className="h-10">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            
            <Button onClick={loadMetrics} disabled={refreshing} variant="outline" size="sm" className="h-10">
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
        
        {/* System Health Alert */}
        {!systemHealthy && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-700 dark:text-red-300">Low Delivery Rate</p>
              <p className="text-sm text-red-600 dark:text-red-400">
                {metrics.delivery_rate}% (Target: 95%+). {metrics.total_failed} notifications failed.
              </p>
            </div>
          </div>
        )}
        
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4 lg:mb-6">
          {/* Total Sent */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 lg:p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] lg:text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Total Sent</p>
                <p className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-white mt-1">{metrics.total_sent.toLocaleString()}</p>
              </div>
              <Send className="w-5 h-5 lg:w-6 lg:h-6 text-slate-500 opacity-60" />
            </div>
          </div>
          
          {/* Delivery Rate */}
          <div className={`rounded-xl p-3 lg:p-4 border ${
            systemHealthy 
              ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20' 
              : 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] lg:text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Delivery Rate</p>
                <p className={`text-xl lg:text-2xl font-bold mt-1 ${deliveryRateColor}`}>{metrics.delivery_rate}%</p>
              </div>
              <Target className={`w-5 h-5 lg:w-6 lg:h-6 opacity-60 ${systemHealthy ? 'text-emerald-500' : 'text-amber-500'}`} />
            </div>
          </div>
          
          {/* Failed */}
          <div className={`rounded-xl p-3 lg:p-4 border ${
            metrics.total_failed > 0
              ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20'
              : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] lg:text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Failed</p>
                <p className={`text-xl lg:text-2xl font-bold mt-1 ${metrics.total_failed > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {metrics.total_failed}
                </p>
              </div>
              {metrics.total_failed > 0 ? (
                <XCircle className="w-5 h-5 lg:w-6 lg:h-6 text-red-500 opacity-60" />
              ) : (
                <CheckCircle className="w-5 h-5 lg:w-6 lg:h-6 text-emerald-500 opacity-60" />
              )}
            </div>
          </div>
          
          {/* System Status */}
          <div className={`rounded-xl p-3 lg:p-4 border ${
            systemHealthy
              ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20'
              : 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] lg:text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Status</p>
                <p className={`text-lg lg:text-xl font-bold mt-1 ${systemHealthy ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {systemHealthy ? 'Healthy' : 'Degraded'}
                </p>
              </div>
              {systemHealthy ? (
                <Wifi className="w-5 h-5 lg:w-6 lg:h-6 text-emerald-500 opacity-60" />
              ) : (
                <WifiOff className="w-5 h-5 lg:w-6 lg:h-6 text-amber-500 opacity-60" />
              )}
            </div>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex overflow-x-auto gap-2 pb-1 -mx-1 px-1 lg:hidden">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                activeTab === tab.value
                  ? 'bg-violet-50 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-500/30'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}
            >
              {tab.label} {tab.count !== undefined && <span className="ml-1 opacity-70">{tab.count}</span>}
            </button>
          ))}
        </div>
        
        {/* Desktop Tabs */}
        <div className="hidden lg:flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.value
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label} {tab.count !== undefined && <span className="ml-1 opacity-50">({tab.count})</span>}
            </button>
          ))}
        </div>
      </div>
      
      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Charts */}
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Hourly Volume */}
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  <h3 className="font-semibold text-slate-900 dark:text-white">Hourly Volume</h3>
                </div>
                <div className="h-[200px] lg:h-[250px]">
                  <Line 
                    data={hourlyChartData} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { 
                          position: 'bottom' as const,
                          labels: { usePointStyle: true, padding: 20 }
                        }
                      },
                      scales: {
                        y: { beginAtZero: true, grid: { display: false } },
                        x: { grid: { display: false } }
                      }
                    }} 
                  />
                </div>
              </CardContent>
            </Card>
            
            {/* Type Distribution */}
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  <h3 className="font-semibold text-slate-900 dark:text-white">By Type</h3>
                </div>
                <div className="h-[200px] lg:h-[250px] flex items-center justify-center">
                  {metrics.by_type.length > 0 ? (
                    <Doughnut 
                      data={typeChartData} 
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { 
                            position: 'bottom' as const,
                            labels: { usePointStyle: true, padding: 15 }
                          }
                        },
                        cutout: '60%'
                      }} 
                    />
                  ) : (
                    <p className="text-slate-500 dark:text-slate-400">No data</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Recent Notifications */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Send className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  <h3 className="font-semibold text-slate-900 dark:text-white">Recent Notifications</h3>
                </div>
                <Badge variant="outline" className="text-xs">{metrics.recent_notifications.length}</Badge>
              </div>
              
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {metrics.recent_notifications.length === 0 ? (
                  <div className="text-center py-8">
                    <Bell className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-500 dark:text-slate-400">No notifications sent yet</p>
                  </div>
                ) : (
                  metrics.recent_notifications.map((notif) => {
                    const status = notif.failed_at ? 'failed' : notif.delivered_at ? 'delivered' : 'pending';
                    const statusConfig = getStatusConfig(status);
                    const StatusIcon = statusConfig.icon;
                    
                    return (
                      <div
                        key={notif.id}
                        className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${statusConfig.bg}`}>
                              <StatusIcon className={`w-4 h-4 ${statusConfig.text}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-slate-900 dark:text-white text-sm">
                                  {notif.type.replace(/_/g, ' ')}
                                </span>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                                  {statusConfig.label}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                                User: {notif.user_id?.substring(0, 8) || 'N/A'}...
                              </p>
                              {notif.failure_reason && (
                                <p className="text-xs text-red-500 mt-1">{notif.failure_reason}</p>
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-slate-400 flex-shrink-0">
                            {notif.sent_at ? new Date(notif.sent_at).toLocaleTimeString() : '—'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {activeTab === 'types' && (
        <div className="space-y-3">
          {metrics.by_type.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                <Activity className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No Data</h3>
              <p className="text-slate-500 dark:text-slate-400">No notifications in selected time range.</p>
            </div>
          ) : (
            metrics.by_type.map((type) => {
              const deliveryRate = type.count > 0 ? (type.delivered / type.count) * 100 : 0;
              const isHealthy = deliveryRate >= 95;
              
              return (
                <Card key={type.type} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center">
                          <Bell className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                        </div>
                        <div>
                          <h4 className="font-medium text-slate-900 dark:text-white capitalize">
                            {type.type.replace(/_/g, ' ')}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {type.count} sent • {type.delivered} delivered
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${isHealthy ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                          {Math.round(deliveryRate)}%
                        </p>
                        {type.failed > 0 && (
                          <p className="text-xs text-red-500">{type.failed} failed</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all rounded-full ${isHealthy ? 'bg-emerald-500' : deliveryRate >= 80 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${deliveryRate}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}
      
      {activeTab === 'failures' && (
        <div className="space-y-3">
          {metrics.recent_failures.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No Failures</h3>
              <p className="text-slate-500 dark:text-slate-400">All notifications delivered successfully.</p>
            </div>
          ) : (
            metrics.recent_failures.map((failure) => (
              <Card key={failure.id} className="bg-white dark:bg-slate-900 border-red-200 dark:border-red-500/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center flex-shrink-0">
                      <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-medium text-slate-900 dark:text-white capitalize">
                          {failure.type.replace(/_/g, ' ')}
                        </h4>
                        <span className="text-xs text-slate-400">
                          {failure.created_at ? new Date(failure.created_at).toLocaleString() : '—'}
                        </span>
                      </div>
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1">{failure.reason}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
      
      {activeTab === 'subscriptions' && (
        <UserSubscriptionsList />
      )}

      {/* Mobile Filter Sheet */}
      <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-0 gap-0 rounded-t-3xl rounded-b-none fixed bottom-0 top-auto translate-y-0">
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-slate-700" />
          </div>
          
          <DialogHeader className="px-6 pb-4">
            <DialogTitle className="text-slate-900 dark:text-white text-lg font-semibold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              Time Range
            </DialogTitle>
          </DialogHeader>
          
          <div className="px-6 pb-8 space-y-5">
            <div className="grid grid-cols-2 gap-2">
              {(['24h', '7d', '30d', 'all'] as TimeRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => {
                    setTimeRange(range);
                    setIsFilterOpen(false);
                  }}
                  className={`py-3 px-3 rounded-xl text-sm font-medium transition-all border ${
                    timeRange === range
                      ? 'bg-violet-50 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-500/30'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {range === '24h' ? 'Last 24 Hours' : range === '7d' ? 'Last 7 Days' : range === '30d' ? 'Last 30 Days' : 'All Time'}
                </button>
              ))}
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button onClick={exportToCSV} variant="outline" className="flex-1 h-12">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button
                onClick={() => {
                  loadMetrics();
                  setIsFilterOpen(false);
                }}
                className="flex-1 h-12 bg-violet-600 hover:bg-violet-700 text-white"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, email, device_token, xeon_stream_subscription, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      if (!profiles) {
        setUsers([]);
        return;
      }

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
    const matchesSearch = !searchTerm || 
      user.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());

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
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-xl p-3 border border-emerald-200 dark:border-emerald-500/20">
          <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 uppercase">Subscribed</p>
          <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{subscribedCount}</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
          <p className="text-[10px] font-medium text-slate-600 dark:text-slate-400 uppercase">Unsubscribed</p>
          <p className="text-xl font-bold text-slate-700 dark:text-slate-300">{unsubscribedCount}</p>
        </div>
        <div className="bg-violet-50 dark:bg-violet-500/10 rounded-xl p-3 border border-violet-200 dark:border-violet-500/20">
          <p className="text-[10px] font-medium text-violet-600 dark:text-violet-400 uppercase">With Device</p>
          <p className="text-xl font-bold text-violet-700 dark:text-violet-300">{withPlayerIdCount}</p>
        </div>
      </div>
      
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
            style={{ fontSize: '16px' }}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { value: 'all' as const, label: 'All', count: users.length },
            { value: 'subscribed' as const, label: 'Subscribed', count: subscribedCount },
            { value: 'unsubscribed' as const, label: 'Not Subscribed', count: unsubscribedCount },
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => setFilterStatus(filter.value)}
              className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                filterStatus === filter.value
                  ? 'bg-violet-50 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-500/30'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}
            >
              {filter.label} <span className="opacity-60">({filter.count})</span>
            </button>
          ))}
        </div>
      </div>
      
      {/* User List */}
      <div className="space-y-2">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400">No users found</p>
          </div>
        ) : (
          filteredUsers.map((user) => (
            <Card key={user.id} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    user.xeon_stream_subscription 
                      ? 'bg-emerald-100 dark:bg-emerald-500/20' 
                      : 'bg-slate-100 dark:bg-slate-800'
                  }`}>
                    <User className={`w-5 h-5 ${
                      user.xeon_stream_subscription 
                        ? 'text-emerald-600 dark:text-emerald-400' 
                        : 'text-slate-500'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-medium text-slate-900 dark:text-white truncate">
                        {user.display_name || user.email?.split('@')[0] || 'User'}
                      </h4>
                      {user.xeon_stream_subscription ? (
                        <Badge className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30 flex-shrink-0">
                          <Wifi className="w-3 h-3 mr-1" />
                          Subscribed
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-500 flex-shrink-0">
                          <WifiOff className="w-3 h-3 mr-1" />
                          Not Subscribed
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {user.email || 'No email'}
                    </p>
                    
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {user.device_token ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                          <Smartphone className="w-3 h-3" />
                          Device registered
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                          <Smartphone className="w-3 h-3" />
                          No device
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                        <Bell className="w-3 h-3" />
                        {user.total_notifications_received} received
                      </span>
                      {user.total_notifications_received > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                          <Target className="w-3 h-3" />
                          {user.delivery_rate}% rate
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
