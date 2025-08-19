import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';

interface SignalStreamLoaderProps {
  children: React.ReactNode;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  error?: string | null;
}

export const SignalStreamLoader: React.FC<SignalStreamLoaderProps> = ({
  children,
  connectionStatus,
  error
}) => {
  const [showLoader, setShowLoader] = useState(true);

  // Show loader for initial connection and brief periods during reconnection
  useEffect(() => {
    if (connectionStatus === 'connected') {
      // Brief delay to prevent flashing
      const timer = setTimeout(() => setShowLoader(false), 500);
      return () => clearTimeout(timer);
    } else if (connectionStatus === 'connecting') {
      setShowLoader(true);
    } else if (connectionStatus === 'error' || error) {
      setShowLoader(false);
    }
  }, [connectionStatus, error]);

  if (connectionStatus === 'error' && error) {
    return (
      <div className="min-h-[400px] flex items-center justify-center p-4">
        <Card className="border-destructive/50 bg-destructive/5 max-w-md">
          <CardContent className="flex items-center gap-3 p-6">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <h3 className="font-medium text-destructive mb-1">Connection Error</h3>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showLoader && connectionStatus !== 'connected') {
    return (
      <div className="space-y-4 p-4">
        <div className="flex items-center gap-2 mb-6">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-4 rounded-full" />
        </div>
        
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Skeleton className="h-4 w-16 mb-1" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                  <div>
                    <Skeleton className="h-4 w-20 mb-1" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                </div>
                <Skeleton className="h-4 w-full" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return <>{children}</>;
};