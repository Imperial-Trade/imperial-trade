import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const PushNotificationTester: React.FC = () => {
  const { user } = useAuth();
  const { permission, isGranted, hasSubscription, initialized, requestPermission } = useNotifications();
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any>(null);

  const testPushNotificationFlow = async () => {
    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'Please log in to test notifications',
        variant: 'destructive'
      });
      return;
    }

    setTesting(true);
    setResults(null);

    try {
      console.log('🔔 Starting push notification test...');
      
      // Step 1: Check current status
      const status = {
        initialized,
        permission,
        isGranted,
        hasSubscription,
        userAgent: navigator.userAgent,
        isStandalone: window.matchMedia('(display-mode: standalone)').matches,
        oneSignalReady: !!window.OneSignal
      };
      
      console.log('📊 Current status:', status);

      // Step 2: Try to get OneSignal player ID
      let playerId = null;
      if (window.OneSignal) {
        try {
          playerId = await window.OneSignal.getExternalUserId();
          console.log('🆔 OneSignal Player ID:', playerId);
        } catch (error) {
          console.log('❌ Failed to get OneSignal Player ID:', error);
        }
      }

      // Step 3: Verify subscription with backend
      const { data: verifyResult, error: verifyError } = await supabase.functions.invoke(
        'onesignal-verify-subscription',
        { body: { user_id: user.id, player_id: playerId } }
      );

      console.log('🔍 Verification result:', verifyResult, verifyError);

      // Step 4: Test notification request if not already granted
      let permissionResult = null;
      if (permission !== 'granted') {
        console.log('🚀 Requesting notification permission...');
        permissionResult = await requestPermission();
        console.log('✅ Permission result:', permissionResult);
      }

      // Step 5: Create a test signal to trigger notifications
      if (permission === 'granted' || permissionResult?.success) {
        console.log('📡 Creating test signal...');
        const { data: signalData, error: signalError } = await supabase
          .from('trade_alerts')
          .insert({
            user_id: user.id,
            asset_name: 'EURUSD',
            trade_type: 'buy',
            entry_price: 1.0850,
            stop_loss: 1.0800,
            tp1: 1.0900,
            status: 'pending',
            tradermade_symbol: 'EURUSD'
          })
          .select()
          .single();

        console.log('📈 Test signal created:', signalData, signalError);

        // Clean up test signal after 5 seconds
        if (signalData?.id) {
          setTimeout(async () => {
            await supabase.from('trade_alerts').delete().eq('id', signalData.id);
            console.log('🧹 Test signal cleaned up');
          }, 5000);
        }
      }

      setResults({
        status,
        playerId,
        verifyResult,
        verifyError,
        permissionResult,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Test failed:', error);
      toast({
        title: 'Test Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>🔔 Push Notification Tester</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Initialized:</strong> {initialized ? '✅' : '❌'}
          </div>
          <div>
            <strong>Permission:</strong> {permission}
          </div>
          <div>
            <strong>Is Granted:</strong> {isGranted ? '✅' : '❌'}
          </div>
          <div>
            <strong>Has Subscription:</strong> {hasSubscription ? '✅' : '❌'}
          </div>
        </div>

        <Button 
          onClick={testPushNotificationFlow}
          disabled={testing || !user}
          className="w-full"
        >
          {testing ? 'Testing...' : 'Run Push Notification Test'}
        </Button>

        {results && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-bold mb-2">Test Results:</h3>
            <pre className="text-xs overflow-auto whitespace-pre-wrap">
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};