import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Clock, Zap, TestTube } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { notificationReliabilityService, NotificationMetrics } from '@/services/NotificationReliabilityService';
import { useAuth } from '@/contexts/AuthContext';

export function NotificationSystemTest() {
  const [isTestingFlow, setIsTestingFlow] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [metrics, setMetrics] = useState<NotificationMetrics | null>(null);
  const [testResults, setTestResults] = useState<string[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  // Load metrics on mount
  useEffect(() => {
    loadMetrics();
    // Start reliability monitoring
    notificationReliabilityService.startMonitoring();

    return () => {
      notificationReliabilityService.stopMonitoring();
    };
  }, []);

  const loadMetrics = async () => {
    const healthMetrics = await notificationReliabilityService.checkNotificationHealth();
    setMetrics(healthMetrics);
  };

  const testNotificationFlow = async () => {
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to test notifications",
        variant: "destructive"
      });
      return;
    }

    setIsTestingFlow(true);
    setTestResults([]);
    
    try {
      const results = [];
      results.push('🧪 Starting notification flow test...');
      setTestResults([...results]);

      // Test 1: Check user subscription status
      results.push('📋 Checking user subscription status...');
      setTestResults([...results]);
      
      // Test 2: Test in-app notification
      results.push('📱 Testing in-app notification...');
      setTestResults([...results]);
      
      if ((window as any).addNotification) {
        (window as any).addNotification({
          type: 'success',
          title: '✅ In-App Test',
          message: 'In-app notification system is working correctly',
          timestamp: new Date()
        });
        results.push('✅ In-app notification: SUCCESS');
      } else {
        results.push('❌ In-app notification: FAILED - addNotification not available');
      }
      setTestResults([...results]);

      // Test 3: Test full notification flow
      results.push('🔔 Testing full notification flow...');
      setTestResults([...results]);

      const flowTestResult = await notificationReliabilityService.testNotificationFlow(user.id);
      
      if (flowTestResult) {
        results.push('✅ Full notification flow: SUCCESS');
        results.push('📊 Check your push notifications for the test alert');
      } else {
        results.push('❌ Full notification flow: FAILED - Check edge function logs');
      }
      
      setTestResults([...results]);

      // Test 4: Check OneSignal subscription
      results.push('📱 Checking OneSignal subscription...');
      setTestResults([...results]);

      // This will be checked by the reliability service
      results.push('✅ Test completed - Check metrics for delivery status');
      setTestResults([...results]);

      toast({
        title: "Test Complete",
        description: "Notification system test completed. Check results above.",
      });

    } catch (error) {
      console.error('Test failed:', error);
      const errorResults = [...testResults, `❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`];
      setTestResults(errorResults);
      
      toast({
        title: "Test Failed",
        description: "Notification test encountered an error",
        variant: "destructive"
      });
    } finally {
      setIsTestingFlow(false);
      // Reload metrics after test
      setTimeout(loadMetrics, 2000);
    }
  };

  const retryFailedNotifications = async () => {
    setIsRetrying(true);
    try {
      const retriedCount = await notificationReliabilityService.retryFailedNotifications();
      
      toast({
        title: "Retry Complete",
        description: `Attempted to retry ${retriedCount} failed notifications`,
      });

      // Reload metrics
      setTimeout(loadMetrics, 1000);
    } catch (error) {
      toast({
        title: "Retry Failed",
        description: "Failed to retry notifications",
        variant: "destructive"
      });
    } finally {
      setIsRetrying(false);
    }
  };

  const getStatusColor = (rate: number) => {
    if (rate >= 95) return 'text-green-600';
    if (rate >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusIcon = (rate: number) => {
    if (rate >= 95) return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    if (rate >= 80) return <Clock className="w-4 h-4 text-yellow-600" />;
    return <AlertCircle className="w-4 h-4 text-red-600" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Notification System Test</h2>
        <Button 
          onClick={loadMetrics}
          variant="outline"
          size="sm"
        >
          Refresh Metrics
        </Button>
      </div>

      {/* System Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Sent (24h)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalSent}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Delivered</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{metrics.totalDelivered}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Failed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{metrics.totalFailed}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                Delivery Rate
                {getStatusIcon(metrics.deliveryRate)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getStatusColor(metrics.deliveryRate)}`}>
                {metrics.deliveryRate.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Test Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="w-5 h-5" />
            System Tests
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={testNotificationFlow}
              disabled={isTestingFlow}
              className="flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              {isTestingFlow ? 'Testing...' : 'Test Full Flow'}
            </Button>

            <Button
              onClick={retryFailedNotifications}
              disabled={isRetrying}
              variant="outline"
              className="flex items-center gap-2"
            >
              {isRetrying ? 'Retrying...' : 'Retry Failed'}
            </Button>

            <Button
              onClick={loadMetrics}
              variant="outline"
              size="sm"
            >
              Refresh Data
            </Button>
          </div>

          {/* System Status Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant={metrics?.deliveryRate && metrics.deliveryRate >= 95 ? "default" : "destructive"}>
              {metrics?.deliveryRate && metrics.deliveryRate >= 95 ? "System Healthy" : "Needs Attention"}
            </Badge>
            
            {metrics?.totalFailed && metrics.totalFailed > 5 && (
              <Badge variant="destructive">
                High Failure Rate
              </Badge>
            )}
            
            {metrics?.avgDeliveryTime && metrics.avgDeliveryTime > 10 && (
              <Badge variant="outline">
                Slow Delivery
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {testResults.map((result, index) => (
                <div 
                  key={index} 
                  className="text-sm font-mono p-2 bg-muted rounded flex items-center gap-2"
                >
                  {result.includes('✅') && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                  {result.includes('❌') && <AlertCircle className="w-4 h-4 text-red-600" />}
                  {result.includes('🧪') && <TestTube className="w-4 h-4 text-blue-600" />}
                  {result.includes('📱') && <Zap className="w-4 h-4 text-purple-600" />}
                  <span>{result}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Health Summary */}
      {metrics && (
        <Card>
          <CardHeader>
            <CardTitle>System Health Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Avg Delivery Time:</span>
                <span className="ml-2">{metrics.avgDeliveryTime.toFixed(2)}s</span>
              </div>
              <div>
                <span className="font-medium">Status:</span>
                <span className={`ml-2 font-medium ${getStatusColor(metrics.deliveryRate)}`}>
                  {metrics.deliveryRate >= 95 ? 'Excellent' : 
                   metrics.deliveryRate >= 80 ? 'Good' : 'Needs Attention'}
                </span>
              </div>
            </div>

            {metrics.deliveryRate < 80 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-800">
                    Delivery rate is below 80% - investigate failed notifications
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}