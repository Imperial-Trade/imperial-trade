import React, { useState, Suspense, lazy, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, ChevronLeft, ChevronRight } from "lucide-react";
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
const EnhancedTradeNotificationDashboard = lazy(() => import("@/components/admin/EnhancedTradeNotificationDashboard").then(m => ({
  default: m.EnhancedTradeNotificationDashboard
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
  const [isCollapsed, setIsCollapsed] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  );
  const [isDesktop, setIsDesktop] = useState(window.innerWidth > 768);
  
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

  // Responsive handler matching HTML behavior
  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth > 768;
      setIsDesktop(desktop);
      
      if (!desktop) {
        setIsCollapsed(true);
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize(); // Initialize
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize desktop state on mount (like DOMContentLoaded in HTML)
  useEffect(() => {
    const mainContent = document.getElementById('admin-main-content');
    const dashboardCard = document.getElementById('admin-dashboard-card');
    
    if (!mainContent || !dashboardCard) return;
    
    // Measure window size directly at mount (matching HTML DOMContentLoaded)
    const isInitialDesktop = window.innerWidth > 768;
    const isInitialCollapsed = !isInitialDesktop; // Collapsed on mobile, open on desktop
    
    if (isInitialCollapsed) {
      // When COLLAPSED, remove .shifted class (default CSS: 120px margin)
      mainContent.classList.remove('shifted');
      dashboardCard.classList.remove('shifted');
    } else {
      // When OPEN, apply .shifted class (CSS: 312px margin + scale)
      mainContent.classList.add('shifted');
      dashboardCard.classList.add('shifted');
    }
  }, []); // Runs once on mount, measuring window directly

  // Dynamic class management like HTML JavaScript
  useEffect(() => {
    const mainContent = document.getElementById('admin-main-content');
    const dashboardCard = document.getElementById('admin-dashboard-card');
    
    if (!mainContent || !dashboardCard) return;
    
    if (isDesktop) {
      if (isCollapsed) {
        // When COLLAPSED, remove .shifted class (default CSS: 120px margin)
        mainContent.classList.remove('shifted');
        dashboardCard.classList.remove('shifted');
      } else {
        // When OPEN, apply .shifted class (CSS: 312px margin + scale)
        mainContent.classList.add('shifted');
        dashboardCard.classList.add('shifted');
      }
    } else {
      // Mobile: always collapsed, no .shifted class (uses default 120px)
      mainContent.classList.remove('shifted');
      dashboardCard.classList.remove('shifted');
    }
  }, [isCollapsed, isDesktop]);

  return (
    <>
      {/* Main Content with Dynamic Margin */}
      <div 
        id="admin-main-content"
        className="w-full min-h-screen pt-4 px-4 pb-4 md:px-6 md:pb-6 transition-[margin-right] duration-[400ms] ease-[cubic-bezier(0.25,1,0.5,1)]"
      >
        <div 
          id="admin-dashboard-card"
          className="transition-transform duration-[400ms] ease-[cubic-bezier(0.25,1,0.5,1)]"
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">

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
              <EnhancedTradeNotificationDashboard />
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
        </div>
      </div>

      {/* Toggle Button - Always Visible */}
      <button
        id="sidebar-toggle"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="transition-transform duration-300 ease-in-out hover:scale-110"
        style={{
          transform: isCollapsed ? 'translateX(12px)' : 'translateX(0)',
        }}
        title="Toggle Sidebar"
      >
        {isCollapsed ? (
          <ChevronRight className="w-6 h-6 text-gray-300" />
        ) : (
          <ChevronLeft className="w-6 h-6 text-gray-300" />
        )}
      </button>

      {/* Fixed Right Sidebar */}
      <AdminPanelSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isCollapsed={isCollapsed}
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
    </>
  );
};
export default AdminPanel;