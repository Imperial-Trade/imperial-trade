
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Users, Shield, Settings, RefreshCw, Signal, Bell, Code } from "lucide-react";
import { EnhancedUserManagementTable } from "@/components/admin/EnhancedUserManagementTable";
import { DirectAccountRequestManagement } from "@/components/admin/DirectAccountRequestManagement";
import { AdminNotificationSystem } from "@/components/admin/AdminNotificationSystem";
import { SystemMonitoring } from "@/components/admin/SystemMonitoring";
import { RateLimitManager } from "@/components/admin/RateLimitManager";
import { AdminSignalManagement } from "@/components/admin/AdminSignalManagement";
import { DevToolsPanel } from "@/components/admin/DevToolsPanel";
import { isDevToolsEnabled } from "@/utils/featureFlags";

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState("requests");

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Panel</h1>
          <p className="text-muted-foreground mt-1">Manage users, requests, and system settings</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-green-50 border-green-200 text-green-800">
            <Shield className="w-3 h-3 mr-1" />
            Admin Access
          </Badge>
          {isDevToolsEnabled() && (
            <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-800">
              <Code className="w-3 h-3 mr-1" />
              Dev Tools Enabled
            </Badge>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={`grid w-full ${isDevToolsEnabled() ? 'grid-cols-8' : 'grid-cols-7'}`}>
          <TabsTrigger value="requests" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Requests
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="signals" className="flex items-center gap-2">
            <Signal className="w-4 h-4" />
            Signals
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            System
          </TabsTrigger>
          <TabsTrigger value="rate-limits" className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Rate Limits
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Settings
          </TabsTrigger>
          {isDevToolsEnabled() && (
            <TabsTrigger value="dev-tools" className="flex items-center gap-2">
              <Code className="w-4 h-4" />
              Dev Tools
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="requests" className="space-y-4">
          <DirectAccountRequestManagement />
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <EnhancedUserManagementTable />
        </TabsContent>

        <TabsContent value="signals" className="space-y-4">
          <AdminSignalManagement />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <AdminNotificationSystem />
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <SystemMonitoring />
        </TabsContent>

        <TabsContent value="rate-limits" className="space-y-4">
          <RateLimitManager />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <div className="text-center py-12">
            <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">Advanced Settings</h3>
            <p className="text-muted-foreground">Additional admin configuration options coming soon...</p>
          </div>
        </TabsContent>

        {isDevToolsEnabled() && (
          <TabsContent value="dev-tools" className="space-y-4">
            <DevToolsPanel />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default AdminPanel;
