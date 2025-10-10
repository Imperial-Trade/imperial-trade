import { useSearchParams } from 'react-router-dom';
import { Shield } from 'lucide-react';
import React, { Suspense, lazy } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
const NotificationTestPanel = lazy(() => import("@/components/admin/NotificationTestPanel").then(m => ({
  default: m.NotificationTestPanel
})));
const NotificationAnalyticsDashboard = lazy(() => import("@/components/admin/NotificationAnalyticsDashboard").then(m => ({
  default: m.NotificationAnalyticsDashboard
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
  const adminSection = searchParams.get('admin');

  return (
    <div className="min-h-screen w-full bg-background p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Shield className="w-10 h-10 text-primary" />
          <div>
            <h1 className="text-4xl font-bold text-foreground">Admin Tools</h1>
            <p className="text-muted-foreground mt-1">
              Use the Admin Arsenal sidebar on the right to select a tool
            </p>
          </div>
        </div>
        
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
              <div className="space-y-4">
                <NotificationTestPanel />
                <NotificationAnalyticsDashboard />
                <AdminNotificationSystem />
              </div>
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
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="cost">Cost Tracking</TabsTrigger>
                    <TabsTrigger value="messages">Message Rate</TabsTrigger>
                    <TabsTrigger value="health">WebSocket Health</TabsTrigger>
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
          
          {!adminSection && (
            <div className="glass-container rounded-3xl p-8 border border-border">
              <div className="text-center py-12">
                <Shield className="w-16 h-16 text-primary mx-auto mb-4 opacity-50" />
                <p className="text-xl text-muted-foreground">
                  Select a tool from the Admin Arsenal to begin
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Swipe from the right edge or press <kbd className="px-2 py-1 bg-accent rounded text-xs border border-border">Alt+A</kbd>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
