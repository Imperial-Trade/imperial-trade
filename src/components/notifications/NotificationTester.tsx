import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  TestTube, 
  Bell, 
  Target, 
  AlertTriangle, 
  TrendingUp,
  Volume2,
  Smartphone,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useAudioNotifications } from '@/hooks/useAudioNotifications';
import { useEnhancedHaptics } from '@/hooks/useEnhancedHaptics';
import { useNotifications } from '@/contexts/NotificationsContext';

interface TestNotification {
  type: 'critical' | 'important' | 'standard' | 'info';
  title: string;
  message: string;
  icon: React.ReactNode;
  color: string;
}

const TEST_NOTIFICATIONS: TestNotification[] = [
  {
    type: 'critical',
    title: '🚨 EURUSD Stop Loss Hit',
    message: 'SL triggered at 1.0850 - Position closed',
    icon: <AlertTriangle className="w-5 h-5 text-red-400" />,
    color: 'border-red-500 bg-red-500/10'
  },
  {
    type: 'important',
    title: '🎯 GBPUSD TP1 Hit!',
    message: 'Take Profit 1 reached at 1.2650 (+85 pips)',
    icon: <Target className="w-5 h-5 text-emerald-400" />,
    color: 'border-emerald-500 bg-emerald-500/10'
  },
  {
    type: 'standard',
    title: '📈 New USDJPY Signal',
    message: 'Buy Limit at 148.50 - Risk: 30 pips',
    icon: <TrendingUp className="w-5 h-5 text-blue-400" />,
    color: 'border-blue-500 bg-blue-500/10'
  },
  {
    type: 'info',
    title: 'ℹ️ EURUSD Signal Updated',
    message: 'Stop loss moved to breakeven',
    icon: <Bell className="w-5 h-5 text-orange-400" />,
    color: 'border-orange-500 bg-orange-500/10'
  }
];

const NotificationTester: React.FC = () => {
  const [selectedType, setSelectedType] = useState<string>('important');
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});
  const [isTesting, setIsTesting] = useState(false);
  
  const { playTestSound } = useAudioNotifications();
  const { triggerSuccess, triggerError, isAvailable: hapticAvailable } = useEnhancedHaptics();
  const { isGranted, permission } = useNotifications();

  const selectedNotification = TEST_NOTIFICATIONS.find(n => n.type === selectedType) || TEST_NOTIFICATIONS[1];

  const testComponent = async (componentName: string, testFn: () => Promise<boolean> | boolean) => {
    setIsTesting(prev => ({ ...prev, [componentName]: true }));
    
    try {
      const result = await Promise.resolve(testFn());
      setTestResults(prev => ({ ...prev, [componentName]: result }));
      
      if (result) {
        triggerSuccess();
      } else {
        triggerError();
      }
    } catch (error) {
      console.error(`Test failed for ${componentName}:`, error);
      setTestResults(prev => ({ ...prev, [componentName]: false }));
      triggerError();
    } finally {
      setIsTesting(prev => ({ ...prev, [componentName]: false }));
    }
  };

  const testAudio = () => testComponent('audio', async () => {
    return await playTestSound(selectedNotification.type as any);
  });

  const testHaptic = () => testComponent('haptic', () => {
    if (!hapticAvailable) return false;
    triggerSuccess();
    return true;
  });

  const testPushNotification = () => testComponent('push', async () => {
    if (!isGranted) return false;
    
    try {
      // Add to global notification system
      if ((window as any).addNotification) {
        (window as any).addNotification({
          type: selectedNotification.type,
          title: selectedNotification.title,
          message: selectedNotification.message
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Push notification test failed:', error);
      return false;
    }
  });

  const testAllComponents = async () => {
    await testAudio();
    await testHaptic();
    await testPushNotification();
  };

  const getTestStatus = (component: string) => {
    if (isTesting?.[component]) return 'testing';
    if (testResults[component] === true) return 'success';
    if (testResults[component] === false) return 'error';
    return 'idle';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'testing':
        return <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return null;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <TestTube className="w-5 h-5 text-primary" />
          <CardTitle>Notification Testing</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Test your notification setup to ensure everything works correctly
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Permission Status */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
          <div>
            <p className="font-medium text-sm">Notification Permission</p>
            <p className="text-xs text-muted-foreground">Current browser permission status</p>
          </div>
          <Badge variant={isGranted ? 'default' : 'destructive'}>
            {permission}
          </Badge>
        </div>

        {/* Test Selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Select notification type to test:</label>
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TEST_NOTIFICATIONS.map((notification) => (
                <SelectItem key={notification.type} value={notification.type}>
                  <div className="flex items-center space-x-2">
                    {notification.icon}
                    <span>{notification.title}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Preview */}
        <div className={`p-4 rounded-lg border-2 ${selectedNotification.color}`}>
          <div className="flex items-start space-x-3">
            <div className="mt-1">{selectedNotification.icon}</div>
            <div className="flex-1">
              <h4 className="font-semibold text-sm">{selectedNotification.title}</h4>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedNotification.message}
              </p>
            </div>
          </div>
        </div>

        {/* Individual Tests */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">Component Tests</h3>
          
          <div className="grid gap-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center space-x-3">
                <Volume2 className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">Audio System</p>
                  <p className="text-xs text-muted-foreground">Test notification sounds</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusIcon(getTestStatus('audio'))}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={testAudio}
                  disabled={isTesting?.audio}
                >
                  Test Audio
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center space-x-3">
                <Smartphone className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">Haptic Feedback</p>
                  <p className="text-xs text-muted-foreground">Test device vibration</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusIcon(getTestStatus('haptic'))}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={testHaptic}
                  disabled={isTesting?.haptic || !hapticAvailable}
                >
                  Test Haptic
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center space-x-3">
                <Bell className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">Push Notifications</p>
                  <p className="text-xs text-muted-foreground">Test in-app notifications</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusIcon(getTestStatus('push'))}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={testPushNotification}
                  disabled={isTesting?.push || !isGranted}
                >
                  Test Push
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Test All Button */}
        <Button 
          onClick={testAllComponents}
          disabled={Object.values(isTesting).some(Boolean) || !isGranted}
          className="w-full"
        >
          {Object.values(isTesting).some(Boolean) ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Testing...</span>
            </div>
          ) : (
            'Test All Components'
          )}
        </Button>

        {!isGranted && (
          <div className="text-center text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
            ⚠️ Notifications not enabled. Enable them first to test all features.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationTester;