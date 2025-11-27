import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Bell, CheckCircle2, Loader2, Play, Send, TestTube, Users } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TestResult {
  success: boolean;
  message: string;
  metrics?: {
    processed: number;
    sent: number;
    failed: number;
    in_app_sent: number;
    push_sent: number;
    errors: string[];
  };
  processing_time_ms?: number;
}

export const NotificationTestPanel: React.FC = () => {
  const { user } = useAuth();
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testConfig, setTestConfig] = useState({
    userId: user?.id || '',
    notificationType: 'test',
    assetName: 'BTC/USD',
    tradeType: 'BUY',
    entryPrice: '50000',
    customMessage: 'This is a test notification from the admin panel'
  });

  const notificationTypes = [
    { value: 'test', label: 'Test Notification' },
    { value: 'signal_created', label: '🚀 Signal Created' },
    { value: 'signal_updated', label: 'Signal Updated' },
    { value: 'tp_hit', label: '💰 Take Profit Hit' },
    { value: 'stop_loss_hit', label: '🔴 Stop Loss Hit' },
    { value: 'limit_activated', label: '✅ Limit Order Activated' },
    { value: 'notes_updated', label: '📝 Notes Updated' },
    { value: 'signal_closed', label: 'Signal Closed' }
  ];

  const assetOptions = [
    'BTC/USD', 'ETH/USD', 'EUR/USD', 'GBP/USD', 'USD/JPY', 
    'AUD/USD', 'USD/CAD', 'USD/CHF', 'NZD/USD', 'GOLD', 'SILVER'
  ];

  const handleRunTest = async () => {
    if (!testConfig.userId) {
      toast.error('User ID is required for testing');
      return;
    }

    setIsTestRunning(true);
    setTestResult(null);

    try {
      console.log('Running notification test with config:', testConfig);

      const { data, error } = await supabase.functions.invoke('test-notification', {
        body: {
          userId: testConfig.userId,
          notificationType: testConfig.notificationType,
          assetName: testConfig.assetName,
          tradeType: testConfig.tradeType,
          entryPrice: parseFloat(testConfig.entryPrice) || 50000,
          customMessage: testConfig.customMessage
        }
      });

      if (error) {
        throw error;
      }

      console.log('Test notification response:', data);

      setTestResult(data);

      if (data.success) {
        toast.success('Test notification sent successfully!');
      } else {
        toast.error('Test notification failed: ' + data.message);
      }

    } catch (error) {
      console.error('Test notification error:', error);
      setTestResult({
        success: false,
        message: error.message || 'Failed to send test notification'
      });
      toast.error('Test failed: ' + (error.message || 'Unknown error'));
    } finally {
      setIsTestRunning(false);
    }
  };

  const handleQuickTest = async (type: string) => {
    setTestConfig(prev => ({ ...prev, notificationType: type }));
    // Small delay to ensure state update
    setTimeout(() => handleRunTest(), 100);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Notification Test Panel
          </CardTitle>
          <CardDescription>
            Test the enhanced notification system with OneSignal integration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Test Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="userId">Target User ID</Label>
              <Input
                id="userId"
                value={testConfig.userId}
                onChange={(e) => setTestConfig(prev => ({ ...prev, userId: e.target.value }))}
                placeholder="Enter user ID to test"
              />
            </div>

            <div>
              <Label htmlFor="notificationType">Notification Type</Label>
              <Select
                value={testConfig.notificationType}
                onValueChange={(value) => setTestConfig(prev => ({ ...prev, notificationType: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {notificationTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="assetName">Asset Name</Label>
              <Select
                value={testConfig.assetName}
                onValueChange={(value) => setTestConfig(prev => ({ ...prev, assetName: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assetOptions.map(asset => (
                    <SelectItem key={asset} value={asset}>
                      {asset}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="entryPrice">Entry Price</Label>
              <Input
                id="entryPrice"
                type="number"
                value={testConfig.entryPrice}
                onChange={(e) => setTestConfig(prev => ({ ...prev, entryPrice: e.target.value }))}
                placeholder="Enter price"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="customMessage">Custom Message (Optional)</Label>
            <Textarea
              id="customMessage"
              value={testConfig.customMessage}
              onChange={(e) => setTestConfig(prev => ({ ...prev, customMessage: e.target.value }))}
              placeholder="Custom test message"
              rows={2}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={handleRunTest} 
              disabled={isTestRunning || !testConfig.userId}
              className="flex items-center gap-2"
            >
              {isTestRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Run Test
            </Button>

            <Button 
              variant="outline" 
              onClick={() => handleQuickTest('signal_created')}
              disabled={isTestRunning}
              size="sm"
            >
              <Bell className="h-4 w-4 mr-1" />
              Quick Signal Test
            </Button>

            <Button 
              variant="outline" 
              onClick={() => handleQuickTest('tp_hit')}
              disabled={isTestRunning}
              size="sm"
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              TP Hit Test
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {testResult.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              Test Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant={testResult.success ? "default" : "destructive"}>
                {testResult.success ? 'SUCCESS' : 'FAILED'}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {testResult.message}
              </span>
            </div>

            {testResult.metrics && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-muted rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold">{testResult.metrics.processed}</div>
                  <div className="text-sm text-muted-foreground">Processed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{testResult.metrics.sent}</div>
                  <div className="text-sm text-muted-foreground">Sent</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{testResult.metrics.in_app_sent}</div>
                  <div className="text-sm text-muted-foreground">In-App</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{testResult.metrics.push_sent}</div>
                  <div className="text-sm text-muted-foreground">Push</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{testResult.metrics.failed}</div>
                  <div className="text-sm text-muted-foreground">Failed</div>  
                </div>
              </div>
            )}

            {testResult.processing_time_ms && (
              <div className="text-sm text-muted-foreground">
                Processing time: {testResult.processing_time_ms}ms
              </div>
            )}

            {testResult.metrics?.errors && testResult.metrics.errors.length > 0 && (
              <div className="space-y-2">
                <Label>Errors:</Label>
                <div className="bg-red-50 p-3 rounded border text-sm">
                  {testResult.metrics.errors.map((error, index) => (
                    <div key={index} className="text-red-700">
                      • {error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Testing Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• <strong>User ID:</strong> Enter a valid user ID from your system to test notifications</p>
          <p>• <strong>Notification Types:</strong> Test different scenarios like signal creation, TP hits, etc.</p>
          <p>• <strong>OneSignal:</strong> Ensure the user has OneSignal player ID and push permissions enabled</p>
          <p>• <strong>Real-time:</strong> Check both push notifications and in-app real-time updates</p>
          <p>• <strong>Logs:</strong> Check Edge Function logs for detailed processing information</p>
        </CardContent>
      </Card>
    </div>
  );
};