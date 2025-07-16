
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Shield, Settings, Database, RefreshCw, Signal } from "lucide-react";
import { EnhancedUserManagementTable } from "@/components/admin/EnhancedUserManagementTable";
import { EnhancedAccountRequestManagement } from "@/components/admin/EnhancedAccountRequestManagement";
import { SystemMonitoring } from "@/components/admin/SystemMonitoring";
import { RateLimitManager } from "@/components/admin/RateLimitManager";
import { AdminSignalManagement } from "@/components/admin/AdminSignalManagement";

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState("requests");

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-gray-600 mt-1">Manage users, requests, and system settings</p>
        </div>
        <Badge variant="outline" className="bg-green-50 border-green-200 text-green-800">
          <Shield className="w-3 h-3 mr-1" />
          Admin Access
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="requests" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
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
        </TabsList>

        <TabsContent value="requests" className="space-y-4">
          <EnhancedAccountRequestManagement />
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                User Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EnhancedUserManagementTable />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="signals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Signal className="w-5 h-5" />
                Signal Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AdminSignalManagement />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                System Monitoring
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SystemMonitoring />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rate-limits" className="space-y-4">
          <RateLimitManager />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Admin Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Advanced admin settings coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;
