import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Send, TestTube, AlertTriangle, CheckCircle } from "lucide-react";

interface TestResult {
  phase: string;
  success: boolean;
  message: string;
  details?: any;
}

const NotificationTestingPanel: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [testMessage, setTestMessage] = useState("🚨 Test Alert: Gold BUY signal triggered");
  const [testResults, setTestResults] = useState<TestResult[]>([]);

  const runComprehensiveTest = async () => {
    setIsLoading(true);
    setTestResults([]);
    
    try {
      console.log('🧪 Starting comprehensive notification pipeline test...');
      
      // Phase 1: Test OneSignal API connectivity
      addTestResult('OneSignal API Test', true, 'Testing OneSignal connectivity...');
      
      const { data: onesignalTest, error: onesignalError } = await supabase.functions.invoke('onesignal-test-notification', {
        body: {
          test_type: 'emergency_pipeline_test',
          message: testMessage,
          emergency_mode: true
        }
      });
      
      if (onesignalError) {
        addTestResult('OneSignal API Test', false, `OneSignal test failed: ${onesignalError.message}`);
      } else {
        addTestResult('OneSignal API Test', true, 'OneSignal API accessible', onesignalTest);
      }
      
      // Phase 2: Test signal notification dispatcher
      addTestResult('Signal Dispatcher Test', true, 'Testing signal notification dispatcher...');
      
      const mockSignalNotification = {
        notifications: [{
          signal_id: 'test-signal-' + Date.now(),
          alert_type: 'signal_created',
          target_price: 2650.50,
          triggered_price: 2650.50,
          notification_type: 'signal_created',
          delivery_channels: ['push', 'in_app'],
          asset_name: 'Gold',
          symbol: 'XAUUSD',
          trade_type: 'buy',
          entry_price: 2650.50,
          stop_loss: 2645.00,
          tp1: 2655.00,
          author_id: 'test-user',
          author_name: 'Test Trader',
          include_creator: true
        }]
      };
      
      const { data: dispatcherResult, error: dispatcherError } = await supabase.functions.invoke('signal-notification-dispatcher', {
        body: mockSignalNotification
      });
      
      if (dispatcherError) {
        addTestResult('Signal Dispatcher Test', false, `Dispatcher failed: ${dispatcherError.message}`);
      } else {
        addTestResult('Signal Dispatcher Test', true, 'Dispatcher executed successfully', dispatcherResult);
      }
      
      // Phase 3: Test Player ID emergency fix
      addTestResult('Player ID Recovery Test', true, 'Testing Player ID emergency recovery...');
      
      const { data: emergencyFix, error: emergencyError } = await supabase.functions.invoke('onesignal-player-id-emergency-fix', {
        body: {
          trigger_reason: 'comprehensive_test',
          dry_run: true
        }
      });
      
      if (emergencyError) {
        addTestResult('Player ID Recovery Test', false, `Emergency fix failed: ${emergencyError.message}`);
      } else {
        addTestResult('Player ID Recovery Test', true, 'Player ID recovery system operational', emergencyFix);
      }
      
      // Phase 4: Check user subscription status
      addTestResult('User Subscription Audit', true, 'Auditing user subscription status...');
      
      const { data: userStats } = await supabase
        .from('profiles')
        .select('id, onesignal_player_id, push_subscription_active, onesignal_subscription_status')
        .eq('account_status', 'active');
      
      const totalUsers = userStats?.length || 0;
      const usersWithPlayerIds = userStats?.filter(u => u.onesignal_player_id)?.length || 0;
      const usersWithActiveSubscriptions = userStats?.filter(u => u.push_subscription_active)?.length || 0;
      
      const auditResults = {
        total_active_users: totalUsers,
        users_with_player_ids: usersWithPlayerIds,
        users_with_active_subscriptions: usersWithActiveSubscriptions,
        player_id_capture_rate: totalUsers > 0 ? ((usersWithPlayerIds / totalUsers) * 100).toFixed(1) + '%' : '0%'
      };
      
      addTestResult('User Subscription Audit', true, `User audit completed`, auditResults);
      
      console.log('🧪 Comprehensive test completed');
      toast.success("Comprehensive test completed", {
        description: "Check the results below for detailed analysis"
      });
      
    } catch (error) {
      console.error('🧪 Comprehensive test failed:', error);
      addTestResult('Test Framework', false, `Test execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast.error("Test failed", {
        description: "Check console for detailed error information"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addTestResult = (phase: string, success: boolean, message: string, details?: any) => {
    setTestResults(prev => [...prev, { phase, success, message, details }]);
  };

  const sendTestNotification = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('onesignal-test-notification', {
        body: {
          test_type: 'manual_test',
          message: testMessage
        }
      });

      if (error) throw error;

      toast.success("Test notification sent", {
        description: "Check your device for the test notification"
      });
    } catch (error) {
      console.error('Test notification failed:', error);
      toast.error("Test notification failed", {
        description: error instanceof Error ? error.message : "Unknown error"
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Notification Testing & Diagnostics
        </CardTitle>
        <CardDescription>
          Comprehensive testing tools for the OneSignal notification pipeline
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Quick Test Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Quick Test</h3>
          <div className="flex gap-2">
            <Input
              placeholder="Test message"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              className="flex-1"
            />
            <Button onClick={sendTestNotification} variant="outline" size="sm">
              <Send className="h-4 w-4 mr-2" />
              Send Test
            </Button>
          </div>
        </div>

        <Separator />

        {/* Comprehensive Test Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Comprehensive Pipeline Test</h3>
          <p className="text-xs text-muted-foreground">
            Tests OneSignal connectivity, signal dispatcher, Player ID recovery, and user subscriptions
          </p>
          <Button 
            onClick={runComprehensiveTest} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running Tests...
              </>
            ) : (
              <>
                <TestTube className="h-4 w-4 mr-2" />
                Run Comprehensive Test
              </>
            )}
          </Button>
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Test Results</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {testResults.map((result, index) => (
                  <div key={index} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{result.phase}</span>
                      <Badge variant={result.success ? "default" : "destructive"} className="gap-1">
                        {result.success ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : (
                          <AlertTriangle className="h-3 w-3" />
                        )}
                        {result.success ? 'PASS' : 'FAIL'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{result.message}</p>
                    {result.details && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          Show Details
                        </summary>
                        <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationTestingPanel;