import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, RefreshCw, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EmergencyFixResult {
  success: boolean;
  message: string;
  users_fixed?: number;
  total_processed?: number;
}

export const PlayerIdEmergencyFix: React.FC = () => {
  const { user, profile } = useAuth();
  const [isFixing, setIsFixing] = useState(false);
  const [lastResult, setLastResult] = useState<EmergencyFixResult | null>(null);

  const runEmergencyFix = async () => {
    if (!user?.id) return;

    setIsFixing(true);
    try {
      const { data, error } = await supabase.functions.invoke('onesignal-player-id-emergency-sync', {
        body: { user_id: user.id }
      });

      if (error) {
        throw new Error(error.message);
      }

      setLastResult(data);
      
      if (data.success) {
        toast.success('Player ID sync completed successfully!');
      } else {
        toast.error('Player ID sync failed');
      }
    } catch (err) {
      console.error('Emergency fix error:', err);
      toast.error(`Emergency fix failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setLastResult({
        success: false,
        message: err instanceof Error ? err.message : 'Unknown error'
      });
    } finally {
      setIsFixing(false);
    }
  };

  // Only show for users who might have push issues
  const hasPlayerIdIssue = profile && typeof profile === 'object' && 
    'push_subscription_active' in profile && 
    'onesignal_player_id' in profile &&
    profile.push_subscription_active && 
    !profile.onesignal_player_id;
    
  if (!user || !hasPlayerIdIssue) {
    return null;
  }

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-medium text-yellow-800 mb-1">
            Push Notification Issue Detected
          </h3>
          <p className="text-sm text-yellow-700 mb-3">
            Your push notifications are enabled but there might be a Player ID registration issue. 
            This can prevent you from receiving trading signal alerts.
          </p>
          
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="outline" className="text-yellow-700 border-yellow-300">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Player ID Missing
            </Badge>
          </div>

          {lastResult && (
            <div className={`p-2 rounded text-sm mb-3 ${
              lastResult.success 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              <div className="flex items-center gap-1">
                {lastResult.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                {lastResult.message}
              </div>
            </div>
          )}

          <Button 
            onClick={runEmergencyFix}
            disabled={isFixing}
            size="sm"
            className="gap-2"
          >
            {isFixing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {isFixing ? 'Fixing...' : 'Fix Player ID Registration'}
          </Button>
        </div>
      </div>
    </div>
  );
};