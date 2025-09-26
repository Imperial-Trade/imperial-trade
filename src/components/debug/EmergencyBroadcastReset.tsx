import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { useOptimizedWebSocketPrices } from '@/contexts/OptimizedWebSocketPriceContext';
import { toast } from 'sonner';

/**
 * Emergency Broadcast Reset Component
 * Provides manual controls to fix provider stability issues and restart connections
 */
export const EmergencyBroadcastReset: React.FC = () => {
  const { 
    connectionStatus, 
    emergencyRestart, 
    getProviderStabilityStatus 
  } = useOptimizedWebSocketPrices();
  
  const [isRestarting, setIsRestarting] = useState(false);
  const [lastRestart, setLastRestart] = useState<Date | null>(null);

  const handleEmergencyRestart = async () => {
    setIsRestarting(true);
    try {
      console.log('🚨 EMERGENCY RESTART: User initiated provider reset...');
      
      // Call emergency restart function
      await emergencyRestart();
      
      setLastRestart(new Date());
      toast.success('Emergency restart completed! Provider stability reset.', {
        description: 'Connection should recover within 30 seconds.'
      });
      
      console.log('✅ EMERGENCY RESTART: Complete - Provider should reconnect shortly');
      
    } catch (error) {
      console.error('❌ EMERGENCY RESTART: Failed:', error);
      toast.error('Emergency restart failed', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setIsRestarting(false);
    }
  };

  const getStatusInfo = () => {
    const status = getProviderStabilityStatus();
    
    return {
      connection: connectionStatus,
      isBlocked: status.isBlocked,
      canMount: status.canMount,
      stabilityOk: !status.isBlocked && status.canMount
    };
  };

  const status = getStatusInfo();

  const getConnectionBadgeVariant = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'default';
      case 'connecting':
        return 'secondary';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStabilityBadgeVariant = () => {
    if (status.stabilityOk) return 'default';
    if (status.isBlocked) return 'destructive';
    return 'secondary';
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Emergency Broadcast Controls
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Current Status */}
        <div className="space-y-3">
          <h4 className="font-medium">System Status</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Connection:</span>
              <Badge variant={getConnectionBadgeVariant()}>
                {connectionStatus === 'connected' && <CheckCircle className="h-3 w-3 mr-1" />}
                {connectionStatus === 'error' && <XCircle className="h-3 w-3 mr-1" />}
                {connectionStatus}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Provider Stability:</span>
              <Badge variant={getStabilityBadgeVariant()}>
                {status.stabilityOk ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Stable
                  </>
                ) : status.isBlocked ? (
                  <>
                    <XCircle className="h-3 w-3 mr-1" />
                    Blocked
                  </>
                ) : (
                  'Unstable'
                )}
              </Badge>
            </div>
          </div>
        </div>

        {/* Emergency Actions */}
        <div className="space-y-3">
          <h4 className="font-medium">Emergency Actions</h4>
          
          <div className="space-y-4">
            <Button
              onClick={handleEmergencyRestart}
              disabled={isRestarting}
              variant={status.isBlocked ? "destructive" : "outline"}
              className="w-full"
              size="lg"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRestarting ? 'animate-spin' : ''}`} />
              {isRestarting ? 'Restarting Provider...' : 'Emergency Restart Provider'}
            </Button>
            
            {lastRestart && (
              <p className="text-xs text-muted-foreground text-center">
                Last restart: {lastRestart.toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">When to use Emergency Restart:</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Connection shows "Error" for more than 60 seconds</li>
            <li>• Provider Stability shows "Blocked" status</li>
            <li>• Live prices not updating despite backend working</li>
            <li>• After authentication issues are resolved</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};