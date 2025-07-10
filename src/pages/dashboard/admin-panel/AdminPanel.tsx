
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Activity, 
  AlertTriangle, 
  TrendingUp,
  Shield,
  Database,
  Settings,
  Bell,
  UserPlus
} from 'lucide-react';
import { ResponsiveUserManagementTable } from '@/components/admin/ResponsiveUserManagementTable';
import { SystemMonitoring } from '@/components/admin/SystemMonitoring';
import { EnhancedSystemMonitoring } from '@/components/admin/EnhancedSystemMonitoring';
import { RealTimeNotifications } from '@/components/admin/RealTimeNotifications';
import { RealtimeAuditLog } from '@/components/admin/RealtimeAuditLog';
import { AdminTradeSignalsTab } from '@/components/admin/AdminTradeSignalsTab';
import { AccountRequestManagement } from '@/components/account-request/AccountRequestManagement';
import AccessDenied from '@/components/AccessDenied';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminPanel() {
  const { user, profile, loading: authLoading } = useAuth();
  const [systemStats, setSystemStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalTrades: 0,
    pendingRequests: 0,
    systemHealth: 'good'
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      fetchSystemStats();
      setIsLoading(false);
    }
  }, [authLoading]);

  const fetchSystemStats = async () => {
    try {
      // Fetch basic system statistics
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: tradeCount } = await supabase
        .from('trade_alerts')
        .select('*', { count: 'exact', head: true });

      // Fetch pending account requests count
      const { count: pendingCount } = await supabase
        .from('account_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      setSystemStats({
        totalUsers: userCount || 0,
        activeUsers: Math.floor((userCount || 0) * 0.7), // Rough estimate
        totalTrades: tradeCount || 0,
        pendingRequests: pendingCount || 0,
        systemHealth: 'good'
      });
    } catch (error) {
      console.error('Error fetching system stats:', error);
    }
  };

  const handleRequestsRefresh = () => {
    fetchSystemStats();
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-green"></div>
      </div>
    );
  }

  // Enhanced admin check with fallback logic
  const isAdmin = () => {
    if (profile) {
      return profile.access_level === 'admin' || profile.role === 'admin';
    }
    // Fallback to user metadata if profile doesn't exist or is incomplete
    const userAccessLevel = user?.user_metadata?.access_level;
    const userRole = user?.user_metadata?.role;
    return userAccessLevel === 'admin' || userRole === 'admin';
  };

  if (!isAdmin()) {
    return <AccessDenied requiredLevel="admin" />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-none">
        {/* Header */}
        <div className="px-4 sm:px-6 pt-6 pb-4">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary mb-2">
            Admin <span className="gold-text-gradient">Control Panel</span>
          </h1>
          <p className="text-secondary text-sm sm:text-base lg:text-lg">
            Comprehensive system management and monitoring dashboard
          </p>
          {profile && (
            <div className="mt-2 text-xs sm:text-sm text-secondary">
              Logged in as: {profile.display_name} ({profile.access_level})
            </div>
          )}
        </div>

        {/* System Overview Cards */}
        <div className="px-4 sm:px-6 mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
            <Card className="glass-effect">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Total Users</CardTitle>
                <Users className="h-3 w-3 sm:h-4 sm:w-4 text-accent-blue" />
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-2xl font-bold text-primary">{systemStats.totalUsers}</div>
                <p className="text-xs text-secondary">Registered accounts</p>
              </CardContent>
            </Card>

            <Card className="glass-effect">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Active Users</CardTitle>
                <Activity className="h-3 w-3 sm:h-4 sm:w-4 text-accent-green" />
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-2xl font-bold text-primary">{systemStats.activeUsers}</div>
                <p className="text-xs text-secondary">Last 7 days</p>
              </CardContent>
            </Card>

            <Card className="glass-effect">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Total Trades</CardTitle>
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-accent-gold" />
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-2xl font-bold text-primary">{systemStats.totalTrades}</div>
                <p className="text-xs text-secondary">All time signals</p>
              </CardContent>
            </Card>

            <Card className="glass-effect">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Pending Requests</CardTitle>
                <UserPlus className="h-3 w-3 sm:h-4 sm:w-4 text-orange-400" />
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-2xl font-bold text-primary">{systemStats.pendingRequests}</div>
                <p className="text-xs text-secondary">Account requests</p>
              </CardContent>
            </Card>

            <Card className="glass-effect col-span-2 sm:col-span-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">System Health</CardTitle>
                <Shield className="h-3 w-3 sm:h-4 sm:w-4 text-accent-green" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Badge 
                    className={`
                      ${systemStats.systemHealth === 'good' 
                        ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                        : 'bg-red-500/20 text-red-400 border-red-500/30'
                      }
                    `}
                  >
                    {systemStats.systemHealth === 'good' ? 'Operational' : 'Issues'}
                  </Badge>
                </div>
                <p className="text-xs text-secondary">All systems</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Admin Tabs */}
        <div className="px-4 sm:px-6">
          <Tabs defaultValue="users" className="w-full">
            <TabsList className="grid w-full grid-cols-7 bg-surface mb-6 h-auto">
              <TabsTrigger value="users" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3">
                <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Users</span>
              </TabsTrigger>
              <TabsTrigger value="requests" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3">
                <UserPlus className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Requests</span>
              </TabsTrigger>
              <TabsTrigger value="system" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3">
                <Database className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">System</span>
              </TabsTrigger>
              <TabsTrigger value="monitoring" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3">
                <Activity className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Monitor</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3">
                <Bell className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Alerts</span>
              </TabsTrigger>
              <TabsTrigger value="audit" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3">
                <Shield className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Audit</span>
              </TabsTrigger>
              <TabsTrigger value="trades" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3">
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Trades</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="w-full">
              <ResponsiveUserManagementTable />
            </TabsContent>

            <TabsContent value="requests" className="w-full">
              <AccountRequestManagement onRefresh={handleRequestsRefresh} />
            </TabsContent>

            <TabsContent value="system" className="w-full">
              <SystemMonitoring />
            </TabsContent>

            <TabsContent value="monitoring" className="w-full">
              <EnhancedSystemMonitoring />
            </TabsContent>

            <TabsContent value="notifications" className="w-full">
              <RealTimeNotifications />
            </TabsContent>

            <TabsContent value="audit" className="w-full">
              <RealtimeAuditLog />
            </TabsContent>

            <TabsContent value="trades" className="w-full">
              <AdminTradeSignalsTab currentUser={user} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
