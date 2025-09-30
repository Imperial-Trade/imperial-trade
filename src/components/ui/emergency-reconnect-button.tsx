import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface EmergencyReconnectButtonProps {
  onReconnect: () => Promise<void> | void;
  errorMessage?: string;
  className?: string;
  variant?: 'default' | 'destructive' | 'outline';
}

export function EmergencyReconnectButton({
  onReconnect,
  errorMessage = 'Connection lost',
  className,
  variant = 'destructive'
}: EmergencyReconnectButtonProps) {
  const [reconnecting, setReconnecting] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const maxAttempts = 3;

  const handleEmergencyReconnect = async () => {
    if (attempts >= maxAttempts) {
      toast({
        title: 'Max Attempts Reached',
        description: 'Please refresh the page manually or contact support.',
        variant: 'destructive'
      });
      return;
    }

    setReconnecting(true);
    setAttempts(prev => prev + 1);
    
    try {
      await onReconnect();
      toast({
        title: 'Reconnected Successfully',
        description: 'Connection has been restored',
      });
      setAttempts(0); // Reset on success
    } catch (error) {
      toast({
        title: 'Reconnection Failed',
        description: `Attempt ${attempts + 1}/${maxAttempts}. Trying again...`,
        variant: 'destructive'
      });
    } finally {
      setReconnecting(false);
    }
  };

  return (
    <div className={cn('flex flex-col items-center gap-2 p-4 border border-destructive/50 rounded-lg bg-destructive/5', className)}>
      <div className="flex items-center gap-2 text-sm text-destructive">
        <AlertTriangle className="w-4 h-4" />
        <span className="font-medium">{errorMessage}</span>
      </div>
      
      <Button
        variant={variant}
        size="sm"
        onClick={handleEmergencyReconnect}
        disabled={reconnecting || attempts >= maxAttempts}
        className="gap-2"
      >
        <RefreshCw className={cn('w-4 h-4', reconnecting && 'animate-spin')} />
        {reconnecting ? 'Reconnecting...' : attempts >= maxAttempts ? 'Max Attempts Reached' : 'Emergency Reconnect'}
      </Button>

      {attempts > 0 && (
        <span className="text-xs text-muted-foreground">
          Attempt {attempts} of {maxAttempts}
        </span>
      )}
    </div>
  );
}
