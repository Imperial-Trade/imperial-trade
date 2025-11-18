import React, { useEffect, useState } from 'react';
import { usePusherBeams } from '@/hooks/usePusherBeams';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, BellOff, Check, X } from 'lucide-react';

export const PusherBeamsTest: React.FC = () => {
  const { isInitialized, isPushEnabled, subscribeToPush, unsubscribeFromPush, getDeviceId } = usePusherBeams();
  const [deviceId, setDeviceId] = useState<string | null>(null);

  useEffect(() => {
    if (isInitialized) {
      getDeviceId().then(setDeviceId);
    }
  }, [isInitialized, getDeviceId, isPushEnabled]);

  return (
    <Card className="max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Pusher Beams Test Panel
        </CardTitle>
        <CardDescription>
          Test your push notification integration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Indicators */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {isInitialized ? (
              <Check className="w-5 h-5 text-green-500" />
            ) : (
              <X className="w-5 h-5 text-red-500" />
            )}
            <span className="font-medium">
              Pusher Beams SDK: {isInitialized ? 'Initialized ✅' : 'Not Initialized ❌'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isPushEnabled ? (
              <Bell className="w-5 h-5 text-green-500" />
            ) : (
              <BellOff className="w-5 h-5 text-gray-500" />
            )}
            <span className="font-medium">
              Push Notifications: {isPushEnabled ? 'Enabled ✅' : 'Disabled'}
            </span>
          </div>

          {deviceId && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Device ID: {deviceId}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          {!isPushEnabled ? (
            <Button
              onClick={subscribeToPush}
              disabled={!isInitialized}
              className="flex items-center gap-2"
            >
              <Bell className="w-4 h-4" />
              Enable Push Notifications
            </Button>
          ) : (
            <Button
              onClick={unsubscribeFromPush}
              variant="destructive"
              className="flex items-center gap-2"
            >
              <BellOff className="w-4 h-4" />
              Disable Push Notifications
            </Button>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
          <p className="font-semibold">📋 Test Instructions:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Click "Enable Push Notifications"</li>
            <li>Grant permission when your browser prompts you</li>
            <li>Look for "Successfully registered and subscribed!" in console</li>
            <li>Check your browser console for your Device ID</li>
            <li>You should now be subscribed to the <code className="bg-background px-1 py-0.5 rounded">trade_alerts</code> interest</li>
          </ol>
        </div>

        {/* Console Output Helper */}
        {isPushEnabled && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-lg">
            <p className="text-sm font-semibold text-green-700 dark:text-green-300">
              ✅ Success! You're now subscribed to trade alerts.
            </p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              Check your browser console for the "Successfully registered and subscribed!" message.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

