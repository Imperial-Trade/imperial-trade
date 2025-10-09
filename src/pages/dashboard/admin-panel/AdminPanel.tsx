import React, { useState, Suspense, lazy } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Menu } from "lucide-react";
import { isDevToolsEnabled } from "@/utils/featureFlags";
import { useAuthorizationAware } from "@/hooks/useAuthorizationAware";
import AdminPanelSidebar from "@/components/admin/AdminPanelSidebar";

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
const LoadingFallback = () => (
  <Card className="glass-effect border-border/50">
    <CardContent className="p-8">
      <div className="flex flex-col items-center justify-center h-32 space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </CardContent>
  </Card>
);
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

  return (
    <div className="flex w-full h-screen overflow-hidden">
      {/* Main Content Area */}
      <div id="admin-main-content" className="flex-1 h-full overflow-y-auto overflow-x-hidden p-4 md:p-6 xl:pr-0 transition-[margin-right] duration-400">
        {/* Mobile breadcrumb navigation */}
        <div className="xl:hidden mb-4 flex items-center justify-between sticky top-0 z-10 bg-background/95 backdrop-blur-sm py-2 -mx-4 px-4 border-b border-border/50">
          <button
            onClick={() => {
              const sidebar = document.querySelector('.admin-sidebar');
              if (sidebar?.classList.contains('collapsed')) {
                const event = new CustomEvent('toggle-admin-sidebar');
                window.dispatchEvent(event);
              }
            }}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Menu className="w-4 h-4" />
            <span className="font-medium capitalize">{activeTab.replace('-', ' ')}</span>
          </button>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">

        {canAccessRequests && <TabsContent value="requests" className="flex-1 overflow-y-auto space-y-4 data-[state=active]:flex data-[state=active]:flex-col">
            <Suspense fallback={<LoadingFallback />}>
              <DirectAccountRequestManagement />
            </Suspense>
          </TabsContent>}

        {canAccessUsers && <TabsContent value="users" className="flex-1 overflow-y-auto space-y-4 data-[state=active]:flex data-[state=active]:flex-col">
            <Suspense fallback={<LoadingFallback />}>
              <ResponsiveUserManagementTable />
            </Suspense>
          </TabsContent>}

        {canAccessSignals && <TabsContent value="signals" className="flex-1 overflow-y-auto space-y-4 data-[state=active]:flex data-[state=active]:flex-col">
            <Suspense fallback={<LoadingFallback />}>
              <AdminSignalManagement />
            </Suspense>
          </TabsContent>}

        {canAccessNotifications && <TabsContent value="notifications" className="flex-1 overflow-y-auto space-y-4 data-[state=active]:flex data-[state=active]:flex-col">
            <Suspense fallback={<LoadingFallback />}>
              <NotificationTestPanel />
              <NotificationAnalyticsDashboard />
              <AdminNotificationSystem />
            </Suspense>
          </TabsContent>}

        {canAccessSystem && <TabsContent value="system" className="flex-1 overflow-y-auto space-y-4 data-[state=active]:flex data-[state=active]:flex-col">
            <Suspense fallback={<LoadingFallback />}>
              <SystemMonitoring />
            </Suspense>
          </TabsContent>}

        {canAccessRateLimits && <TabsContent value="rate-limits" className="flex-1 overflow-y-auto space-y-4 data-[state=active]:flex data-[state=active]:flex-col">
            <Suspense fallback={<LoadingFallback />}>
              <NotificationRateLimitManager />
              <RateLimitManager />
            </Suspense>
          </TabsContent>}

        {canAccessSettings && <TabsContent value="settings" className="flex-1 overflow-y-auto space-y-4 data-[state=active]:flex data-[state=active]:flex-col">
            <div className="text-center py-12">
              <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">Advanced Settings</h3>
              <p className="text-muted-foreground">Additional admin configuration options coming soon...</p>
            </div>
          </TabsContent>}

        {canAccessDiagnostics && <TabsContent value="diagnostics" className="flex-1 overflow-y-auto space-y-4 data-[state=active]:flex data-[state=active]:flex-col">
            <Suspense fallback={<LoadingFallback />}>
              <RealtimeDiagnostics />
            </Suspense>
          </TabsContent>}

        {canAccessOptimization && <TabsContent value="optimization" className="flex-1 overflow-y-auto space-y-4 data-[state=active]:flex data-[state=active]:flex-col">
            <Suspense fallback={<LoadingFallback />}>
              <RealtimeOptimizationDashboard />
            </Suspense>
          </TabsContent>}

        {canAccessMonitoring && <TabsContent value="monitoring" className="flex-1 overflow-y-auto space-y-4 data-[state=active]:flex data-[state=active]:flex-col">
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
                  <Card className="glass-effect border-border/50 p-6">
                    <WebSocketHealthMonitor />
                  </Card>
                </Suspense>
              </TabsContent>
            </Tabs>
          </TabsContent>}

        {canAccessDevTools && <TabsContent value="devtools" className="flex-1 overflow-y-auto space-y-4 data-[state=active]:flex data-[state=active]:flex-col">
            <Suspense fallback={<LoadingFallback />}>
              <DevToolsPanel />
            </Suspense>
          </TabsContent>}
        </Tabs>
      </div>

      {/* Right Sidebar - Desktop & Mobile */}
      <AdminPanelSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        canAccessRequests={canAccessRequests}
        canAccessUsers={canAccessUsers}
        canAccessSignals={canAccessSignals}
        canAccessNotifications={canAccessNotifications}
        canAccessSystem={canAccessSystem}
        canAccessRateLimits={canAccessRateLimits}
        canAccessDiagnostics={canAccessDiagnostics}
        canAccessOptimization={canAccessOptimization}
        canAccessMonitoring={canAccessMonitoring}
        canAccessSettings={canAccessSettings}
        canAccessDevTools={canAccessDevTools}
        userRole={isAdmin ? 'Admin' : isEducatorPlus ? 'Educator+' : isModerator ? 'Moderator' : 'Educator'}
        isDevToolsEnabled={canAccessDevTools}
      />
    </div>
  );
};
export default AdminPanel;