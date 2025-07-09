import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LiveSession } from "@/api/entities";
import { adminTradingService } from "@/api/services/AdminTradingService";
import { adminAuditService } from "@/api/services/AdminAuditService";
import { TradeAlertResponseDto } from "@/domain/dtos/trading/CreateTradeAlertDto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Settings,
  Shield,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Database,
  UserCheck,
  Bell,
  FileText,
  Monitor,
  UserCog,
} from "lucide-react";
import { AccountRequestManagement } from "@/components/account-request/AccountRequestManagement";
import { UserManagementTable } from "@/components/admin/UserManagementTable";
import { SystemMonitoring } from "@/components/admin/SystemMonitoring";
import { RealtimeAuditLog } from "@/components/admin/RealtimeAuditLog";

export default function AdminPanel() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [users, setUsers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [alerts, setAlerts] = useState<TradeAlertResponseDto[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalSessions: 0,
    totalAlerts: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Get current user from Supabase auth
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      setUser(currentUser);

      if (!currentUser) {
        setIsLoading(false);
        return;
      }

      // Verify admin access
      const userRole = currentUser.user_metadata?.access_level;
      if (userRole !== 'admin') {
        console.error('Unauthorized access attempt to admin panel');
        setIsLoading(false);
        return;
      }

      // Log admin panel access
      await adminAuditService.logAdminAction(
        'admin_panel_access',
        currentUser.email || 'unknown',
        'admin_panel',
        'dashboard',
        { timestamp: new Date().toISOString() }
      );

      // Load admin data with proper error handling
      const [sessionsResult, alertsResult, statsResult] = await Promise.all([
        LiveSession.list().catch((error) => {
          console.error('Failed to load sessions:', error);
          return [];
        }),
        adminTradingService.getAllAlertsForAdmin().catch((error) => {
          console.error('Failed to load alerts:', error);
          return { success: false, data: [] };
        }),
        adminTradingService.getSystemStats().catch((error) => {
          console.error('Failed to load stats:', error);
          return { success: false, data: { totalUsers: 0, activeUsers: 0, totalSessions: 0, totalAlerts: 0 } };
        })
      ]);

      // Safely set sessions data
      setSessions(Array.isArray(sessionsResult) ? sessionsResult : []);

      // Safely set alerts data
      if (alertsResult.success && alertsResult.data) {
        setAlerts(alertsResult.data);
      } else {
        setAlerts([]);
      }

      // Safely set stats data
      if (statsResult.success && statsResult.data) {
        setStats(statsResult.data);
      } else {
        setStats({
          totalUsers: 0,
          activeUsers: 0,
          totalSessions: Array.isArray(sessionsResult) ? sessionsResult.length : 0,
          totalAlerts: Array.isArray(alerts) ? alerts.length : 0,
        });
      }

    } catch (error) {
      console.error("Error loading admin data:", error);
    }
    setIsLoading(false);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-6 bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-green mx-auto mb-4"></div>
          <p className="text-secondary">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen p-6 bg-background flex items-center justify-center">
        <Card className="glass-effect border-default max-w-md w-full">
          <CardContent className="p-6 text-center">
            <Shield className="w-16 h-16 text-secondary/50 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-primary mb-2">
              Access Denied
            </h2>
            <p className="text-secondary">
              You need to be logged in to access the admin panel.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check admin access
  const userRole = user.user_metadata?.access_level;
  if (userRole !== 'admin') {
    return (
      <div className="min-h-screen p-6 bg-background flex items-center justify-center">
        <Card className="glass-effect border-default max-w-md w-full">
          <CardContent className="p-6 text-center">
            <Shield className="w-16 h-16 text-secondary/50 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-primary mb-2">
              Unauthorized Access
            </h2>
            <p className="text-secondary">
              You don't have admin privileges to access this panel.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-background">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-primary mb-2">
              Admin <span className="gold-text-gradient">Panel</span>
            </h1>
            <p className="text-secondary text-lg">
              System management and monitoring dashboard
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-accent-green/10 text-accent-green border-accent-green/20">
              <UserCheck className="w-4 h-4 mr-1" />
              Admin Access
            </Badge>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="glass-effect border-default">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-secondary text-sm">Total Users</p>
                  <p className="text-2xl font-bold text-primary">
                    {stats.totalUsers}
                  </p>
                </div>
                <Users className="w-8 h-8 text-accent-green" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-effect border-default">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-secondary text-sm">Active Users</p>
                  <p className="text-2xl font-bold text-primary">
                    {stats.activeUsers}
                  </p>
                </div>
                <Activity className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-effect border-default">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-secondary text-sm">Live Sessions</p>
                  <p className="text-2xl font-bold text-primary">
                    {stats.totalSessions}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-effect border-default">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-secondary text-sm">Total Alerts</p>
                  <p className="text-2xl font-bold text-primary">
                    {stats.totalAlerts}
                  </p>
                </div>
                <Bell className="w-8 h-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-surface/50 border-0 mb-6">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-accent-green data-[state=active]:text-white text-secondary flex items-center gap-2"
            >
              <Activity className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="monitoring"
              className="data-[state=active]:bg-accent-green data-[state=active]:text-white text-secondary flex items-center gap-2"
            >
              <Monitor className="w-4 h-4" />
              System Monitor
            </TabsTrigger>
            <TabsTrigger
              value="user-management"
              className="data-[state=active]:bg-accent-green data-[state=active]:text-white text-secondary flex items-center gap-2"
            >
              <UserCog className="w-4 h-4" />
              User Management
            </TabsTrigger>
            <TabsTrigger
              value="audit-logs"
              className="data-[state=active]:bg-accent-green data-[state=active]:text-white text-secondary flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Audit Logs
            </TabsTrigger>
            <TabsTrigger
              value="account-requests"
              className="data-[state=active]:bg-accent-green data-[state=active]:text-white text-secondary flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Account Requests
            </TabsTrigger>
            <TabsTrigger
              value="sessions"
              className="data-[state=active]:bg-accent-green data-[state=active]:text-white text-secondary flex items-center gap-2"
            >
              <TrendingUp className="w-4 h-4" />
              Sessions
            </TabsTrigger>
            <TabsTrigger
              value="alerts"
              className="data-[state=active]:bg-accent-green data-[state=active]:text-white text-secondary flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4" />
              Trade Alerts
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="data-[state=active]:bg-accent-green data-[state=active]:text-white text-secondary flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="space-y-6">
              <Card className="glass-effect border-default">
                <CardHeader>
                  <CardTitle className="text-primary flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    System Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-primary mb-3">
                        Recent Activity
                      </h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <span className="text-secondary">
                            System running normally
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-blue-400" />
                          <span className="text-secondary">
                            Last backup: 2 hours ago
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Database className="w-4 h-4 text-purple-400" />
                          <span className="text-secondary">
                            Database health: Good
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-primary mb-3">
                        Quick Actions
                      </h4>
                      <div className="space-y-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start border-default text-secondary hover:bg-surface hover:text-primary"
                        >
                          <Users className="w-4 h-4 mr-2" />
                          Manage Users
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start border-default text-secondary hover:bg-surface hover:text-primary"
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          System Settings
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start border-default text-secondary hover:bg-surface hover:text-primary"
                        >
                          <Database className="w-4 h-4 mr-2" />
                          Database Backup
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="monitoring">
            <SystemMonitoring />
          </TabsContent>

          <TabsContent value="user-management">
            <UserManagementTable onRefresh={loadData} />
          </TabsContent>

          <TabsContent value="audit-logs">
            <RealtimeAuditLog />
          </TabsContent>

          <TabsContent value="account-requests">
            <AccountRequestManagement onRefresh={loadData} />
          </TabsContent>

          <TabsContent value="sessions">
            <Card className="glass-effect border-default">
              <CardHeader>
                <CardTitle className="text-primary flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Live Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sessions.length > 0 ? (
                  <div className="space-y-4">
                    {sessions.map((session) => (
                      <div
                        key={session.id}
                        className="p-4 bg-surface/50 rounded-lg"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-primary">
                            {session.title}
                          </h4>
                          <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
                            Live
                          </Badge>
                        </div>
                        <p className="text-secondary text-sm mb-2">
                          {session.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-secondary">
                          <span>Started: {formatDate(session.created_at)}</span>
                          <span>
                            Participants: {session.participant_count || 0}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <TrendingUp className="w-16 h-16 text-secondary/50 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-primary mb-2">
                      No Active Sessions
                    </h3>
                    <p className="text-secondary">
                      There are currently no live trading sessions.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts">
            <Card className="glass-effect border-default">
              <CardHeader>
                <CardTitle className="text-primary flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Trade Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {alerts.length > 0 ? (
                  <div className="space-y-4">
                    {alerts.slice(0, 10).map((alert) => (
                      <div
                        key={alert.id}
                        className="p-4 bg-surface/50 rounded-lg"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-primary">
                            {alert.assetName} ({alert.finnhubSymbol})
                          </h4>
                          <Badge
                            className={`${
                              alert.status === "active"
                                ? "bg-green-500/10 text-green-400 border-green-500/20"
                                : alert.status === "closed"
                                ? "bg-red-500/10 text-red-400 border-red-500/20"
                                : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                            } border`}
                          >
                            {alert.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-secondary">
                          <div>
                            <span className="font-medium">Type:</span> {alert.tradeType}
                          </div>
                          <div>
                            <span className="font-medium">Entry:</span> ${alert.entryPrice}
                          </div>
                          <div>
                            <span className="font-medium">Stop Loss:</span> ${alert.stopLoss}
                          </div>
                          <div>
                            <span className="font-medium">Created:</span> {formatDate(alert.createdAt)}
                          </div>
                        </div>
                      </div>
                    ))}
                    {alerts.length > 10 && (
                      <div className="text-center text-secondary text-sm">
                        Showing 10 of {alerts.length} alerts
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertTriangle className="w-16 h-16 text-secondary/50 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-primary mb-2">
                      No Trade Alerts
                    </h3>
                    <p className="text-secondary">
                      No trade alerts have been created yet.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="glass-effect border-default">
              <CardHeader>
                <CardTitle className="text-primary flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  System Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h4 className="font-semibold text-primary mb-3">
                      General Settings
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-secondary mb-2">
                          System Name
                        </label>
                        <Input
                          defaultValue="Trading Platform"
                          className="bg-surface border-default text-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-secondary mb-2">
                          Maintenance Mode
                        </label>
                        <div className="flex items-center gap-2">
                          <input type="checkbox" className="rounded" />
                          <span className="text-secondary text-sm">
                            Enable maintenance mode
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-primary mb-3">
                      Security Settings
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-secondary mb-2">
                          Session Timeout (minutes)
                        </label>
                        <Input
                          type="number"
                          defaultValue="30"
                          className="bg-surface border-default text-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-secondary mb-2">
                          Max Login Attempts
                        </label>
                        <Input
                          type="number"
                          defaultValue="5"
                          className="bg-surface border-default text-primary"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button className="bg-accent-green hover:bg-green-500 text-white">
                      Save Settings
                    </Button>
                    <Button
                      variant="outline"
                      className="border-default text-secondary hover:bg-surface hover:text-primary"
                    >
                      Reset to Defaults
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
