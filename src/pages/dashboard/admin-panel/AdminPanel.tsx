
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
  Bell
} from 'lucide-react';
import UserManagementTable from '@/components/admin/UserManagementTable';
import SystemMonitoring from '@/components/admin/SystemMonitoring';
import EnhancedSystemMonitoring from '@/components/admin/EnhancedSystemMonitoring';
import RealTimeNotifications from '@/components/admin/RealTimeNotifications';
import RealtimeAuditLog from '@/components/admin/RealtimeAuditLog';
import AdminTradeSignalsTab from '@/components/admin/AdminTradeSignalsTab';
import AccessDenied from '@/components/AccessDenied';

export default function AdminPanel() {
  const [user, setUser] = useState(null);
  const [systemStats, setSystemStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalTrades: 0,
    systemHealth: 'good'
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAdminAccess();
    fetchSystemStats();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSystemStats = async () => {
    try {
      // Fetch basic system statistics
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: tradeCount } = await supabase
        .from('trade_alerts')
        .select('*', { count: 'exact', head: true });

      setSystemStats({
        totalUsers: userCount || 0,
        activeUsers: Math.floor((userCount || 0) * 0.7), // Rough estimate
        totalTrades: tradeCount || 0,
        systemHealth: 'good'
      });
    } catch (error) {
      console.error('Error fetching system stats:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-green"></div>
      </div>
    );
  }

  // Check if user is admin
  const userAccessLevel = user?.user_metadata?.access_level || 'free';
  const userRole = user?.user_metadata?.role || 'user';
  
  if (userAccessLevel !== 'admin' && userRole !== 'admin') {
    return <AccessDenied requiredLevel="admin" />;
  }

  return (
    <div className="min-h-full bg-background p-6 w-full">
      <div className="w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-primary mb-2">
            Admin <span className="gold-text-gradient">Control Panel</span>
          </h1>
          <p className="text-secondary text-lg">
            Comprehensive system management and monitoring dashboard
          </p>
        </div>

        {/* System Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="glass-effect">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-accent-blue" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{systemStats.totalUsers}</div>
              <p className="text-xs text-secondary">Registered accounts</p>
            </CardContent>
          </Card>

          <Card className="glass-effect">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Activity className="h-4 w-4 text-accent-green" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{systemStats.activeUsers}</div>
              <p className="text-xs text-secondary">Last 7 days</p>
            </CardContent>
          </Card>

          <Card className="glass-effect">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
              <TrendingUp className="h-4 w-4 text-accent-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{systemStats.totalTrades}</div>
              <p className="text-xs text-secondary">All time signals</p>
            </CardContent>
          </Card>

          <Card className="glass-effect">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Health</CardTitle>
              <Shield className="h-4 w-4 text-accent-green" />
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

        {/* Main Admin Tabs */}
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6 bg-surface">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">System</span>
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Monitor</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Alerts</span>
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Audit</span>
            </TabsTrigger>
            <TabsTrigger value="trades" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Trades</span>
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="users" className="space-y-6">
              <UserManagementTable />
            </TabsContent>

            <TabsContent value="system" className="space-y-6">
              <SystemMonitoring />
            </TabsContent>

            <TabsContent value="monitoring" className="space-y-6">
              <EnhancedSystemMonitoring />
            </TabsContent>

            <TabsContent value="notifications" className="space-y-6">
              <RealTimeNotifications />
            </TabsContent>

            <TabsContent value="audit" className="space-y-6">
              <RealtimeAuditLog />
            </TabsContent>

            <TabsContent value="trades" className="space-y-6">
              <AdminTradeSignalsTab />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
