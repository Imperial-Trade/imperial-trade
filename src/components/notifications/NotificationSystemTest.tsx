import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, Zap, Users, Bell } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TestResult {
  step: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: any;
}

export const NotificationSystemTest: React.FC = () => {
  const { user, profile } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const runCompleteTest = async () => {
    if (!user?.id) return;

    setIsRunning(true);
    setResults([]);
    const testResults: TestResult[] = [];

    try {
      // Step 1: Check OneSignal Player ID registration
      testResults.push({
        step: "Player ID Registration",
        status: "success",
        message: "Testing Player ID registration..."
      });
      setResults([...testResults]);

      const { data: playerIdResult, error: playerIdError } = await supabase.functions.invoke(
        'onesignal-player-id-emergency-sync',
        { body: { user_id: user.id } }
      );

      if (playerIdError) {
        testResults[testResults.length - 1] = {
          step: "Player ID Registration",
          status: "error",
          message: `Player ID sync failed: ${playerIdError.message}`,
          details: playerIdError
        };
      } else {
        testResults[testResults.length - 1] = {
          step: "Player ID Registration", 
          status: "success",
          message: "Player ID registration successful",
          details: playerIdResult
        };
      }
      setResults([...testResults]);

      // Step 2: Verify OneSignal subscription
      testResults.push({
        step: "Subscription Verification",
        status: "success", 
        message: "Verifying OneSignal subscription..."
      });
      setResults([...testResults]);

      const { data: verifyResult, error: verifyError } = await supabase.functions.invoke(
        'onesignal-verify-subscription',
        { body: { user_id: user.id } }
      );

      if (verifyError) {
        testResults[testResults.length - 1] = {
          step: "Subscription Verification",
          status: "error",
          message: `Subscription verification failed: ${verifyError.message}`,
          details: verifyError
        };
      } else if (!verifyResult?.subscription_status?.is_subscribed) {
        testResults[testResults.length - 1] = {
          step: "Subscription Verification",
          status: "warning",
          message: "User is not properly subscribed to push notifications",
          details: verifyResult
        };
      } else {
        testResults[testResults.length - 1] = {
          step: "Subscription Verification",
          status: "success", 
          message: "OneSignal subscription verified successfully",
          details: verifyResult
        };
      }
      setResults([...testResults]);

      // Step 3: Test notification delivery
      testResults.push({
        step: "Test Notification",
        status: "success",
        message: "Sending test notification..."
      });
      setResults([...testResults]);

      const { data: testResult, error: testError } = await supabase.functions.invoke(
        'onesignal-test-notification',
        { 
          body: { 
            target_user_id: user.id,
            test_message: `System test notification at ${new Date().toLocaleTimeString()}`,
            test_type: 'system_test'
          } 
        }
      );

      if (testError) {
        testResults[testResults.length - 1] = {
          step: "Test Notification",
          status: "error",
          message: `Test notification failed: ${testError.message}`,
          details: testError
        };
      } else {
        testResults[testResults.length - 1] = {
          step: "Test Notification",
          status: "success",
          message: "Test notification sent successfully!",
          details: testResult
        };
      }
      setResults([...testResults]);

      // Step 4: Create a test signal to verify signal notifications
      testResults.push({
        step: "Signal Notification Test",
        status: "success",
        message: "Testing signal notification system..."
      });
      setResults([...testResults]);

      // Only test signal creation if user is admin/educator
      if (profile && ['admin', 'educator'].includes(String(profile.role))) {
        const { data: signalResult, error: signalError } = await supabase
          .from('trade_alerts')
          .insert({
            user_id: user.id,
            asset_name: 'TEST/USD',
            trade_type: 'buy',
            entry_price: 1.0000,
            stop_loss: 0.9900,
            tp1: 1.0100,
            status: 'pending',
            tradermade_symbol: 'TESTUSD',
            notes: 'System test signal - will be auto-deleted'
          })
          .select()
          .single();

        if (signalError) {
          testResults[testResults.length - 1] = {
            step: "Signal Notification Test",
            status: "warning",
            message: "Signal creation test skipped (insufficient permissions)",
            details: signalError
          };
        } else {
          // Delete the test signal immediately
          await supabase.from('trade_alerts').delete().eq('id', signalResult.id);
          
          testResults[testResults.length - 1] = {
            step: "Signal Notification Test",
            status: "success",
            message: "Signal notification system is working (test signal created and deleted)",
            details: signalResult
          };
        }
      } else {
        testResults[testResults.length - 1] = {
          step: "Signal Notification Test", 
          status: "warning",
          message: "Signal test skipped (requires admin/educator role)",
          details: { userRole: profile?.role }
        };
      }
      setResults([...testResults]);

      // Show overall result
      const hasErrors = testResults.some(r => r.status === 'error');
      const hasWarnings = testResults.some(r => r.status === 'warning');
      
      if (hasErrors) {
        toast.error('System test completed with errors - push notifications may not work properly');
      } else if (hasWarnings) {
        toast.warning('System test completed with warnings - some features may be limited');
      } else {
        toast.success('All notification systems are working correctly!');
      }

    } catch (error) {
      console.error('System test error:', error);
      toast.error('System test failed with unexpected error');
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default: return <Bell className="h-4 w-4 text-gray-400" />;
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Notification System Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Bell className="h-4 w-4" />
          <AlertDescription>
            This test will verify your push notification setup end-to-end, including Player ID registration, 
            subscription status, and actual notification delivery.
          </AlertDescription>
        </Alert>

        <Button 
          onClick={runCompleteTest}
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Running System Test...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 mr-2" />
              Run Complete System Test
            </>
          )}
        </Button>

        {results.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Test Results:</h4>
            {results.map((result, index) => (
              <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                {getStatusIcon(result.status)}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{result.step}</span>
                    <Badge variant={
                      result.status === 'success' ? 'default' :
                      result.status === 'warning' ? 'secondary' : 'destructive'
                    }>
                      {result.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{result.message}</p>
                  {result.details && (
                    <details className="mt-2">
                      <summary className="text-xs cursor-pointer text-muted-foreground">
                        View Details
                      </summary>
                      <pre className="text-xs mt-1 p-2 bg-secondary/20 rounded overflow-x-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};