import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Zap, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useOneSignalEnhanced } from '@/hooks/useOneSignalEnhanced';
import { supabase } from '@/integrations/supabase/client';

const PlayerIdRecoveryPanel: React.FC = () => {
  const { toast } = useToast();
  const { verifySubscription, requestPermission, ensureOneSignalUserWithPlayerId } = useOneSignalEnhanced();
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState('');

  const handleAggressiveRecovery = async () => {
    setIsRecovering(true);
    
    try {
      // Step 1: Force OneSignal re-initialization
      setRecoveryStep('Reinitializing OneSignal...');
      
      if (window.OneSignal) {
        try {
          await window.OneSignal.logout();
        } catch (e) {
          console.log('OneSignal logout skipped:', e);
        }
      }
      
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Step 2: Request permission again
      setRecoveryStep('Requesting notification permission...');
      const permissionResult = await requestPermission();
      
      if (!permissionResult.success) {
        throw new Error('Permission request failed: ' + permissionResult.error);
      }
      
      // Step 3: Aggressive Player ID capture with retries
      setRecoveryStep('Capturing Player ID...');
      let playerId = null;
      let attempts = 0;
      const maxAttempts = 5;
      
      while (!playerId && attempts < maxAttempts) {
        attempts++;
        setRecoveryStep(`Attempting Player ID capture (${attempts}/${maxAttempts})...`);
        
        try {
          if (window.OneSignal) {
            // Multiple methods to get Player ID
            const methods = [
              () => window.OneSignal.User.PushSubscription.id,
              () => window.OneSignal.User.PushSubscription.token,
              () => window.OneSignal.getSubscription()?.id,
              () => window.OneSignal.getUserId()
            ];
            
            for (const method of methods) {
              try {
                const id = await method();
                if (id && typeof id === 'string' && id.length > 10) {
                  playerId = id;
                  break;
                }
              } catch (e) {
                console.log('Player ID method failed:', e);
              }
            }
          }
          
          if (!playerId) {
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 2000 * attempts));
          }
        } catch (error) {
          console.error(`Player ID capture attempt ${attempts} failed:`, error);
          await new Promise(resolve => setTimeout(resolve, 2000 * attempts));
        }
      }
      
      if (!playerId) {
        throw new Error('Failed to capture Player ID after all attempts');
      }
      
      // Step 4: Emergency database sync
      setRecoveryStep('Syncing with database...');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // Call the edge function with emergency sync
      const { data, error } = await supabase.functions.invoke('onesignal-upsert-user', {
        body: {
          user_id: user.id,
          email: user.email,
          player_id: playerId,
          emergency_sync: true,
          force_update: true,
          tags: {
            platform: 'web',
            is_pwa: window.matchMedia('(display-mode: standalone)').matches.toString(),
            recovery_attempt: new Date().toISOString()
          }
        }
      });
      
      if (error) {
        throw new Error('Database sync failed: ' + error.message);
      }
      
      // Step 5: Verify everything worked
      setRecoveryStep('Verifying setup...');
      await verifySubscription();
      
      toast({
        title: "🎉 Recovery Successful!",
        description: `Player ID captured: ${playerId.substring(0, 8)}... Database updated successfully.`,
      });
      
      setRecoveryStep('');
      
    } catch (error) {
      console.error('Aggressive recovery failed:', error);
      toast({
        title: "Recovery Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
      setRecoveryStep('');
    } finally {
      setIsRecovering(false);
    }
  };

  return (
    <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
          <Zap className="h-5 w-5" />
          Aggressive Player ID Recovery
        </CardTitle>
        <CardDescription className="text-orange-600 dark:text-orange-400">
          Use this if your Player ID is missing or notifications aren't working. This will completely restart the OneSignal setup process.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {recoveryStep && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
            <span className="text-sm text-blue-700 dark:text-blue-300">{recoveryStep}</span>
          </div>
        )}
        
        <div className="flex flex-col gap-2">
          <Button 
            onClick={handleAggressiveRecovery}
            disabled={isRecovering}
            variant="outline"
            className="border-orange-300 text-orange-700 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-900/40"
          >
            {isRecovering ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Recovering...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Start Aggressive Recovery
              </>
            )}
          </Button>
          
          <p className="text-xs text-orange-600 dark:text-orange-400">
            This process includes: OneSignal reinitialization, permission re-request, Player ID capture with 5 retry attempts, and emergency database synchronization.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PlayerIdRecoveryPanel;