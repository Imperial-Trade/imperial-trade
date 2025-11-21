import { useSearchParams, useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import React, { Suspense, lazy, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthorizationAware } from '@/hooks/useAuthorizationAware';

// Lazy load admin components for performance
const DirectAccountRequestManagement = lazy(() => import("@/components/admin/DirectAccountRequestManagement").then(m => ({
  default: m.DirectAccountRequestManagement
})));
const ResponsiveUserManagementTable = lazy(() => import("@/components/admin/ResponsiveUserManagementTable").then(m => ({
  default: m.ResponsiveUserManagementTable
})));
const AdminSignalManagement = lazy(() => import("@/components/admin/AdminSignalManagement").then(m => ({
  default: m.AdminSignalManagement
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
const NotificationRateLimitManager = lazy(() => import("@/components/admin/NotificationRateLimitManager").then(m => ({
  default: m.NotificationRateLimitManager
})));
const RealtimeDiagnostics = lazy(() => import("@/pages/admin/RealtimeDiagnostics").then(m => ({
  default: m.RealtimeDiagnostics
})));
const RealtimeOptimizationDashboard = lazy(() => import("@/pages/admin/RealtimeOptimizationDashboard"));
const CostMonitorDashboard = lazy(() => import("@/components/monitoring/CostMonitorDashboard"));
const RealtimeRateMonitor = lazy(() => import("@/components/admin/RealtimeRateMonitor").then(m => ({
  default: m.RealtimeRateMonitor
})));
const WebSocketHealthMonitor = lazy(() => import("@/components/testing/WebSocketHealthMonitor").then(m => ({
  default: m.WebSocketHealthMonitor
})));
const DevToolsPanel = lazy(() => import("@/components/admin/DevToolsPanel").then(m => ({
  default: m.DevToolsPanel
})));

const LoadingFallback = () => (
  <Card className="glass-effect border-default">
    <CardContent className="p-6">
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-green"></div>
      </div>
    </CardContent>
  </Card>
);

export default function AdminTools() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const adminSection = searchParams.get('admin');
  
  const { 
    isAdmin, 
    isModerator, 
    isEducatorPlus, 
    isEducator, 
    userRoles 
  } = useAuthorizationAware();
  
  // Define access rules matching AdminPanel.tsx exactly
  const canAccessRequests = userRoles?.some(r => ['admin', 'moderator', 'educator+'].includes(r));
  const canAccessUsers = isAdmin;
  const canAccessSignals = userRoles?.some(r => ['admin', 'educator', 'educator+'].includes(r));
  const canAccessNotifications = isAdmin;
  const canAccessSystem = isAdmin;
  const canAccessRateLimits = isAdmin;
  const canAccessDiagnostics = isAdmin;
  const canAccessOptimization = isAdmin;
  const canAccessMonitoring = isAdmin;
  const canAccessSettings = isAdmin;
  
  // Get default admin route based on user role
  const getDefaultAdminRoute = () => {
    // Admin, Educator, Educator+ → Trading Signals
    if (isAdmin || isEducator || isEducatorPlus) {
      return '?admin=signals';
    }
    // Moderator → Account Requests
    if (isModerator) {
      return '?admin=requests';
    }
    // Fallback
    return '?admin=signals';
  };
  
  // Auto-redirect to default section if no admin section is specified
  useEffect(() => {
    // Redirect from old route to new route
    if (window.location.pathname === '/dashboard/advanced-tools') {
      navigate('/dashboard/admin-tools' + getDefaultAdminRoute(), { replace: true });
      return;
    }
    
    // If no admin section specified on new route, add default
    if (!adminSection && window.location.pathname === '/dashboard/admin-tools') {
      navigate('/dashboard/admin-tools' + getDefaultAdminRoute(), { replace: true });
    }
  }, [adminSection, navigate, getDefaultAdminRoute]);
  
  // Validate access for current section
  const hasAccessToSection = () => {
    switch (adminSection) {
      case 'requests': return canAccessRequests;
      case 'users': return canAccessUsers;
      case 'signals': return canAccessSignals;
      case 'notifications': return canAccessNotifications;
      case 'monitor': return canAccessSystem;
      case 'limits': return canAccessRateLimits;
      case 'diagnostics': return canAccessDiagnostics;
      case 'optimization': return canAccessOptimization;
      case 'monitoring': return canAccessMonitoring;
      case 'settings': return canAccessSettings;
      default: return false;
    }
  };
  
  // Show access denied if user doesn't have permission
  if (adminSection && !hasAccessToSection()) {
    return (
      <div className="min-h-screen w-full bg-background p-8 flex items-center justify-center">
        <Card className="glass-effect border-red-500/20 max-w-md">
          <CardContent className="p-8 text-center">
            <Shield className="w-16 h-16 text-red-400 mx-auto mb-4 opacity-50" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">
              You don't have permission to access this admin tool.
            </p>
            <p className="text-sm text-muted-foreground/70">
              Section: {adminSection}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="admin-tools-container min-h-screen w-full bg-background p-4 sm:p-6 lg:p-8 pt-0 lg:pt-20 pb-20 md:pb-6 overflow-y-auto" style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}>
      <div className="max-w-7xl mx-auto">
        {/* Dynamic content based on selected admin section */}
        <div className="space-y-4">
          {adminSection === 'requests' && (
            <Suspense fallback={<LoadingFallback />}>
              <DirectAccountRequestManagement />
            </Suspense>
          )}
          
          {adminSection === 'users' && (
            <Suspense fallback={<LoadingFallback />}>
              <ResponsiveUserManagementTable />
            </Suspense>
          )}
          
          {adminSection === 'signals' && (
            <Suspense fallback={<LoadingFallback />}>
              <AdminSignalManagement />
            </Suspense>
          )}
          
          {adminSection === 'notifications' && (
            <Suspense fallback={<LoadingFallback />}>
              <EnhancedTradeNotificationDashboard />
            </Suspense>
          )}
          
          {adminSection === 'monitor' && (
            <Suspense fallback={<LoadingFallback />}>
              <SystemMonitoring />
            </Suspense>
          )}
          
          {adminSection === 'limits' && (
            <Suspense fallback={<LoadingFallback />}>
              <div className="space-y-4">
                <NotificationRateLimitManager />
                <RateLimitManager />
              </div>
            </Suspense>
          )}
          
          {adminSection === 'diagnostics' && (
            <Suspense fallback={<LoadingFallback />}>
              <RealtimeDiagnostics />
            </Suspense>
          )}
          
          {adminSection === 'optimization' && (
            <Suspense fallback={<LoadingFallback />}>
              <RealtimeOptimizationDashboard />
            </Suspense>
          )}
          
          {adminSection === 'monitoring' && (
            <Suspense fallback={<LoadingFallback />}>
              <div className="space-y-4">
                <Tabs defaultValue="cost" className="w-full">
                  <TabsList className="flex items-center p-1.5 mb-6 rounded-xl backdrop-blur-md border border-white/10 flex-wrap gap-1 w-full h-auto overflow-hidden admin-tabs-glassmorphism">
                    <TabsTrigger 
                      value="cost"
                      className="flex-1 text-center text-xs py-2.5 px-4 rounded-lg font-medium text-gray-400/80 transition-all data-[state=active]:backdrop-blur-md data-[state=active]:border data-[state=active]:border-white/10 data-[state=active]:text-white whitespace-nowrap"
                    >
                      Cost Tracking
                    </TabsTrigger>
                    <TabsTrigger 
                      value="messages"
                      className="flex-1 text-center text-xs py-2.5 px-4 rounded-lg font-medium text-gray-400/80 transition-all data-[state=active]:backdrop-blur-md data-[state=active]:border data-[state=active]:border-white/10 data-[state=active]:text-white whitespace-nowrap"
                    >
                      Message Rate
                    </TabsTrigger>
                    <TabsTrigger 
                      value="health"
                      className="flex-1 text-center text-xs py-2.5 px-4 rounded-lg font-medium text-gray-400/80 transition-all data-[state=active]:backdrop-blur-md data-[state=active]:border data-[state=active]:border-white/10 data-[state=active]:text-white whitespace-nowrap"
                    >
                      WebSocket Health
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="cost">
                    <CostMonitorDashboard />
                  </TabsContent>
                  
                  <TabsContent value="messages">
                    <RealtimeRateMonitor />
                  </TabsContent>
                  
                  <TabsContent value="health">
                    <Card className="p-6">
                      <WebSocketHealthMonitor />
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            </Suspense>
          )}
          
          {adminSection === 'settings' && (
            <div className="glass-container rounded-3xl p-8 border border-border">
              <div className="text-center py-12">
                <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">Advanced Settings</h3>
                <p className="text-muted-foreground">Additional admin configuration options coming soon...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
