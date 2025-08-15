import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bell, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import NotificationDeliveryMonitor from '@/components/notifications/NotificationDeliveryMonitor';
import { NotificationSystemTest } from '@/components/notifications/NotificationSystemTest';
import PlayerIdStatusIndicator from '@/components/notifications/PlayerIdStatusIndicator';

export default function NotificationSystemStatus() {
  const { user, profile } = useAuth();
  const { permission, isGranted, hasSubscription, initialized } = useNotifications();

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Please log in to view your notification system status.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const getPermissionStatus = () => {
    if (permission === 'granted' && hasSubscription) {
      return { status: 'success', message: 'Push notifications are enabled and working', icon: CheckCircle };
    } else if (permission === 'granted' && !hasSubscription) {
      return { status: 'warning', message: 'Permission granted but subscription incomplete', icon: AlertTriangle };
    } else if (permission === 'denied') {
      return { status: 'error', message: 'Push notifications are blocked', icon: AlertTriangle };
    } else {
      return { status: 'warning', message: 'Push notifications not yet configured', icon: AlertTriangle };
    }
  };

  const permissionInfo = getPermissionStatus();
  const StatusIcon = permissionInfo.icon;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Bell className="h-8 w-8" />
        <div>
          <h1 className="text-3xl font-bold">Notification System Status</h1>
          <p className="text-muted-foreground">Monitor and test your push notification setup</p>
        </div>
      </div>

      {/* System Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StatusIcon className="h-5 w-5" />
            System Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="font-medium">OneSignal SDK</span>
              <Badge variant={initialized ? 'default' : 'secondary'}>
                {initialized ? 'Initialized' : 'Loading...'}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="font-medium">Browser Permission</span>
              <Badge variant={
                permission === 'granted' ? 'default' :
                permission === 'denied' ? 'destructive' : 'secondary'
              }>
                {permission === 'granted' ? 'Granted' : 
                 permission === 'denied' ? 'Denied' : 'Default'}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="font-medium">Push Subscription</span>
              <Badge variant={hasSubscription ? 'default' : 'secondary'}>
                {hasSubscription ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>

          <Alert className={
            permissionInfo.status === 'success' ? 'border-green-200 bg-green-50' :
            permissionInfo.status === 'warning' ? 'border-yellow-200 bg-yellow-50' :
            'border-red-200 bg-red-50'
          }>
            <StatusIcon className="h-4 w-4" />
            <AlertDescription>
              {permissionInfo.message}
            </AlertDescription>
          </Alert>

          {/* User Profile Status */}
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-2">User Profile Status</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between">
                <span>Role:</span>
                <Badge variant="outline">{profile?.role || 'user'}</Badge>
              </div>
              <div className="flex justify-between">
                <span>User Type:</span>
                <Badge variant="outline">{profile?.user_type || 'member'}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Push Active:</span>
                <Badge variant={
                  (profile as any)?.push_subscription_active ? 'default' : 'secondary'
                }>
                  {(profile as any)?.push_subscription_active ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Player ID:</span>
                <Badge variant={
                  (profile as any)?.onesignal_player_id ? 'default' : 'destructive'
                }>
                  {(profile as any)?.onesignal_player_id ? 'Registered' : 'Missing'}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Player ID Status - Only show if there might be issues */}
      <PlayerIdStatusIndicator showForced={true} />

      {/* Delivery Monitor */}
      <NotificationDeliveryMonitor />

      {/* System Test */}
      <NotificationSystemTest />

      {/* Help & Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>Troubleshooting Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2 text-sm">
            <p><strong>If notifications aren't working:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Try the "Fix Player ID Registration" button above</li>
              <li>Check your browser's notification settings</li>
              <li>Make sure you're not in incognito/private mode</li>
              <li>For iOS Safari: Add the site to your home screen as a PWA</li>
              <li>Run the complete system test to identify specific issues</li>
            </ul>
          </div>
          
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Trading signal notifications are only sent by admin and educator accounts. 
              All users can receive these notifications when properly subscribed.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}