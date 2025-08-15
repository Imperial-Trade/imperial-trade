/**
 * Automatic Player ID Recovery Hook
 * Silently fixes broken users without UI disruption
 */

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export function useAutomaticPlayerIdRecovery() {
  const { user } = useAuth();
  const [recoveryAttempted, setRecoveryAttempted] = useState(false);
  const [recoveryStatus, setRecoveryStatus] = useState<'idle' | 'running' | 'completed' | 'failed'>('idle');

  useEffect(() => {
    if (!user?.id || recoveryAttempted) return;

    const attemptSilentRecovery = async () => {
      try {
        setRecoveryStatus('running');
        setRecoveryAttempted(true);

        // Check if user needs recovery
        const { data: profile } = await supabase
          .from('profiles')
          .select('onesignal_player_id, push_subscription_active')
          .eq('id', user.id)
          .single();

        const needsRecovery = profile?.push_subscription_active && !profile?.onesignal_player_id;
        
        if (!needsRecovery) {
          setRecoveryStatus('completed');
          return;
        }

        console.log('[AutoRecovery] User needs Player ID recovery, running emergency sync silently...');

        // Run emergency sync for this specific user
        const { data, error } = await supabase.functions.invoke('onesignal-player-id-emergency-sync', {
          body: { user_id: user.id }
        });

        if (error) {
          console.error('[AutoRecovery] Emergency sync failed:', error);
          setRecoveryStatus('failed');
          return;
        }

        if (data?.success) {
          console.log('[AutoRecovery] Silent recovery completed successfully:', data);
          setRecoveryStatus('completed');
        } else {
          console.warn('[AutoRecovery] Emergency sync completed but no success flag:', data);
          setRecoveryStatus('failed');
        }

      } catch (error) {
        console.error('[AutoRecovery] Silent recovery error:', error);
        setRecoveryStatus('failed');
      }
    };

    // Run recovery after a short delay to ensure OneSignal is ready
    const timeoutId = setTimeout(attemptSilentRecovery, 3000);
    
    return () => clearTimeout(timeoutId);
  }, [user?.id, recoveryAttempted]);

  return {
    recoveryStatus,
    recoveryAttempted
  };
}