import React, { useState, Suspense, lazy } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Shield, Settings, RefreshCw, Signal, Bell, Code, Activity, BarChart3 } from "lucide-react";
import { isDevToolsEnabled } from "@/utils/featureFlags";
import { useAuthorizationAware } from "@/hooks/useAuthorizationAware";

// Lazy load heavy admin components to prevent simultaneous hook initialization
const ResponsiveUserManagementTable = lazy(() => import("@/components/admin/ResponsiveUserManagementTable").then(m => ({
  default: m.ResponsiveUserManagementTable
})));
const DirectAccountRequestManagement = lazy(() => import("@/components/admin/DirectAccountRequestManagement").then(m => ({
  default: m.DirectAccountRequestManagement
})));
const AdminNotificationSystem = lazy(() => import("@/components/admin/AdminNotificationSystem").then(m => ({
  default: m.AdminNotificationSystem
})));
const SystemMonitoring = lazy(() => import("@/components/admin/SystemMonitoring").then(m => ({
  default: m.SystemMonitoring
})));
const RateLimitManager = lazy(() => import("@/components/admin/RateLimitManager").then(m => ({
  default: m.RateLimitManager
})));
const AdminSignalManagement = lazy(() => import("@/components/admin/AdminSignalManagement").then(m => ({
  default: m.AdminSignalManagement
})));
const DevToolsPanel = lazy(() => import("@/components/admin/DevToolsPanel").then(m => ({
  default: m.DevToolsPanel
})));
const RealtimeDiagnostics = lazy(() => import("@/pages/admin/RealtimeDiagnostics").then(m => ({
  default: m.RealtimeDiagnostics
})));
const RealtimeOptimizationDashboard = lazy(() => import("@/pages/admin/RealtimeOptimizationDashboard"));
const NotificationAnalyticsDashboard = lazy(() => import("@/components/admin/NotificationAnalyticsDashboard").then(m => ({
  default: m.NotificationAnalyticsDashboard
})));
const NotificationRateLimitManager = lazy(() => import("@/components/admin/NotificationRateLimitManager").then(m => ({
  default: m.NotificationRateLimitManager
})));
const NotificationTestPanel = lazy(() => import("@/components/admin/NotificationTestPanel").then(m => ({
  default: m.NotificationTestPanel
})));
const CostMonitorDashboard = lazy(() => import("@/components/monitoring/CostMonitorDashboard"));
const RealtimeRateMonitor = lazy(() => import("@/components/admin/RealtimeRateMonitor").then(m => ({
  default: m.RealtimeRateMonitor
})));
const WebSocketHealthMonitor = lazy(() => import("@/components/testing/WebSocketHealthMonitor").then(m => ({
  default: m.WebSocketHealthMonitor
})));

// Loading fallback component
const LoadingFallback = () => <Card className="glass-effect border-default">
    <CardContent className="p-6">
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-green"></div>
      </div>
    </CardContent>
  </Card>;
const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState("requests");
  const {
    isAdmin,
    isModerator,
    isEducatorPlus,
    isEducator,
    userRoles
  } = useAuthorizationAware();

  // Define tab access rules based on roles
  const canAccessRequests = userRoles?.some(r => ['admin', 'moderator', 'educator+'].includes(r));
  const canAccessUsers = isAdmin; // Only admins
  const canAccessSignals = userRoles?.some(r => ['admin', 'educator', 'educator+'].includes(r));
  const canAccessNotifications = isAdmin; // Only admins
  const canAccessSystem = isAdmin; // Only admins
  const canAccessRateLimits = isAdmin; // Only admins
  const canAccessDiagnostics = isAdmin; // Only admins
  const canAccessOptimization = isAdmin; // Only admins
  const canAccessMonitoring = isAdmin; // Only admins
  const canAccessSettings = isAdmin; // Only admins
  const canAccessDevTools = isAdmin && isDevToolsEnabled(); // Only admins with dev mode

  return <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="bg-green-50 border-green-200 text-green-800">
          <Shield className="w-3 h-3 mr-1" />
          {isAdmin ? 'Admin' : isEducatorPlus ? 'Educator+' : isModerator ? 'Moderator' : 'Educator'} Access
        </Badge>
        {canAccessDevTools && <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-800">
            <Code className="w-3 h-3 mr-1" />
            Dev Tools Enabled
          </Badge>}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="inline-flex w-auto gap-1" style={{
        gridTemplateColumns: `repeat(${[canAccessRequests, canAccessUsers, canAccessSignals, canAccessNotifications, canAccessSystem, canAccessRateLimits, canAccessDiagnostics, canAccessOptimization, canAccessMonitoring, canAccessSettings, canAccessDevTools].filter(Boolean).length}, minmax(0, 1fr))`
      }}>
          {canAccessRequests && <TabsTrigger value="requests" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Requests
            </TabsTrigger>}
          {canAccessUsers && <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Users
            </TabsTrigger>}
          {canAccessSignals && <TabsTrigger value="signals" className="flex items-center gap-2">
              <Signal className="w-4 h-4" />
              Signals
            </TabsTrigger>}
          {canAccessNotifications && <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Notifications
            </TabsTrigger>}
          {canAccessSystem && <TabsTrigger value="system" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              System
            </TabsTrigger>}
          {canAccessRateLimits && <TabsTrigger value="rate-limits" className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Rate Limits
            </TabsTrigger>}
          {canAccessDiagnostics && <TabsTrigger value="diagnostics" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Diagnostics
            </TabsTrigger>}
          {canAccessOptimization && <TabsTrigger value="optimization" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Optimization
            </TabsTrigger>}
          {canAccessMonitoring && <TabsTrigger value="monitoring" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Monitoring
            </TabsTrigger>}
          {canAccessSettings && <TabsTrigger value="settings" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Settings
            </TabsTrigger>}
          {canAccessDevTools && <TabsTrigger value="devtools" className="flex items-center gap-2">
              <Code className="w-4 h-4" />
              Dev Tools
            </TabsTrigger>}
        </TabsList>

        {canAccessRequests && <TabsContent value="requests" className="space-y-4">
            <Suspense fallback={<LoadingFallback />}>
              <DirectAccountRequestManagement />
            </Suspense>
          </TabsContent>}

        {canAccessUsers && <TabsContent value="users" className="space-y-4">
            <Suspense fallback={<LoadingFallback />}>
              <ResponsiveUserManagementTable />
            </Suspense>
          </TabsContent>}

        {canAccessSignals && <TabsContent value="signals" className="space-y-4">
            <Suspense fallback={<LoadingFallback />}>
              <AdminSignalManagement />
            </Suspense>
          </TabsContent>}

        {canAccessNotifications && <TabsContent value="notifications" className="space-y-4">
            <Suspense fallback={<LoadingFallback />}>
              <NotificationTestPanel />
              <NotificationAnalyticsDashboard />
              <AdminNotificationSystem />
            </Suspense>
          </TabsContent>}

        {canAccessSystem && <TabsContent value="system" className="space-y-4">
            <Suspense fallback={<LoadingFallback />}>
              <SystemMonitoring />
            </Suspense>
          </TabsContent>}

        {canAccessRateLimits && <TabsContent value="rate-limits" className="space-y-4">
            <Suspense fallback={<LoadingFallback />}>
              <NotificationRateLimitManager />
              <RateLimitManager />
            </Suspense>
          </TabsContent>}

        {canAccessSettings && <TabsContent value="settings" className="space-y-4">
            <div className="text-center py-12">
              <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">Advanced Settings</h3>
              <p className="text-muted-foreground">Additional admin configuration options coming soon...</p>
            </div>
          </TabsContent>}

        {canAccessDiagnostics && <TabsContent value="diagnostics" className="space-y-4">
            <Suspense fallback={<LoadingFallback />}>
              <RealtimeDiagnostics />
            </Suspense>
          </TabsContent>}

        {canAccessOptimization && <TabsContent value="optimization" className="space-y-4">
            <Suspense fallback={<LoadingFallback />}>
              <RealtimeOptimizationDashboard />
            </Suspense>
          </TabsContent>}

        {canAccessMonitoring && <TabsContent value="monitoring" className="space-y-4">
            <Tabs defaultValue="cost" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="cost">Cost Tracking</TabsTrigger>
                <TabsTrigger value="messages">Message Rate</TabsTrigger>
                <TabsTrigger value="health">WebSocket Health</TabsTrigger>
              </TabsList>
              
              <TabsContent value="cost" className="space-y-4">
                <Suspense fallback={<LoadingFallback />}>
                  <CostMonitorDashboard />
                </Suspense>
              </TabsContent>
              
              <TabsContent value="messages" className="space-y-4">
                <Suspense fallback={<LoadingFallback />}>
                  <RealtimeRateMonitor />
                </Suspense>
              </TabsContent>
              
              <TabsContent value="health" className="space-y-4">
                <Suspense fallback={<LoadingFallback />}>
                  <Card className="p-6">
                    <WebSocketHealthMonitor />
                  </Card>
                </Suspense>
              </TabsContent>
            </Tabs>
          </TabsContent>}

        {canAccessDevTools && <TabsContent value="devtools" className="space-y-4">
            <Suspense fallback={<LoadingFallback />}>
              <DevToolsPanel />
            </Suspense>
          </TabsContent>}
      </Tabs>
    </div>;
};
export default AdminPanel;