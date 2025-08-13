import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Settings, History } from 'lucide-react';
import { NotificationPreferences } from './NotificationPreferences';
import { NotificationHistory } from './NotificationHistory';
import { useNotifications } from '@/contexts/NotificationsContext';
import NotificationPermissionBanner from './NotificationPermissionBanner';

export const UserNotificationCenter: React.FC = () => {
  const { isGranted, permission } = useNotifications();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Notification Center</h2>
          <p className="text-muted-foreground">
            Manage your notification preferences and view delivery history
          </p>
        </div>
      </div>

      {/* Show permission banner if needed */}
      {permission !== 'granted' && <NotificationPermissionBanner />}

      <Tabs defaultValue="preferences" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="preferences">
          <NotificationPreferences />
        </TabsContent>

        <TabsContent value="history">
          <NotificationHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
};