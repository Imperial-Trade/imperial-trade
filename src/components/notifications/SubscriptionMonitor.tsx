import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, CheckCircle, XCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { toast } from '@/hooks/use-toast';

interface SubscriptionStatus {
  exists: boolean;
  subscribed: boolean;
  inSubscribedSegment: boolean;
  totalSubscriptions: number;
  enabledSubscriptions: number;
  subscriptionDetails: Array<{
    type: string;
    enabled: boolean;
    id: string;
  }>;
  lastActive?: string;
  createdAt?: string;
}

export const SubscriptionMonitor: React.FC = () => {
  const { user } = useAuth();
  const { hasSubscription, requestPermission } = useNotifications();
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkSubscriptionStatus = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('onesignal-verify-subscription', {
        body: { user_id: user.id }
      });

      if (error) {
        console.warn('Subscription verification failed:', error);
        toast({
          title: 'Verification Failed',
          description: 'Could not verify subscription status',
          variant: 'destructive'
        });
        return;
      }

      setStatus(data);
      setLastChecked(new Date());
    } catch (err) {
      console.error('Subscription check error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResubscribe = async () => {
    try {
      setLoading(true);
      const result = await requestPermission();
      
      if (result.success) {
        toast({
          title: 'Resubscribed Successfully',
          description: 'Push notifications are now active'
        });
        // Recheck status after successful resubscription
        setTimeout(() => checkSubscriptionStatus(), 2000);
      } else {
        toast({
          title: 'Resubscription Failed',
          description: result.error || 'Could not reestablish subscription',
          variant: 'destructive'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Auto-check on mount and periodically
  useEffect(() => {
    if (user?.id) {
      checkSubscriptionStatus();
      
      // Check every 5 minutes
      const interval = setInterval(checkSubscriptionStatus, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user?.id]);

  if (!user) return null;

  const getStatusBadge = () => {
    if (!status) return <Badge variant="secondary">Unknown</Badge>;
    
    if (status.subscribed && hasSubscription) {
      return <Badge className="bg-green-500 text-white">Active</Badge>;
    } else if (status.exists && !status.subscribed) {
      return <Badge variant="destructive">Inactive</Badge>;
    } else if (!status.exists) {
      return <Badge variant="secondary">Not Set Up</Badge>;
    } else {
      return <Badge variant="outline">Partial</Badge>;
    }
  };

  const needsAttention = status && (!status.subscribed || !hasSubscription || !status.inSubscribedSegment);

  return (
    <Card className={needsAttention ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950' : ''}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Subscription Status
          {getStatusBadge()}
        </CardTitle>
        <CardDescription>
          Monitor your push notification subscription health
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {status.exists ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span>OneSignal User: {status.exists ? 'Exists' : 'Missing'}</span>
              </div>
              
              <div className="flex items-center gap-2">
                {status.subscribed ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span>Push Subscription: {status.subscribed ? 'Active' : 'Inactive'}</span>
              </div>
              
              <div className="flex items-center gap-2">
                {hasSubscription ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span>Local Status: {hasSubscription ? 'Ready' : 'Not Ready'}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {status.inSubscribedSegment ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                )}
                <span>In Segment: {status.inSubscribedSegment ? 'Yes' : 'No'}</span>
              </div>
              
              <div>
                <span className="text-muted-foreground">Active Subscriptions: </span>
                <Badge variant="outline">
                  {status.enabledSubscriptions}/{status.totalSubscriptions}
                </Badge>
              </div>

              {status.subscriptionDetails.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  <p>Types: {status.subscriptionDetails.map(s => s.type).join(', ')}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={checkSubscriptionStatus}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Check Status
          </Button>

          {needsAttention && (
            <Button
              size="sm"
              onClick={handleResubscribe}
              disabled={loading}
            >
              <Bell className="h-4 w-4 mr-2" />
              Resubscribe
            </Button>
          )}
        </div>

        {lastChecked && (
          <p className="text-xs text-muted-foreground">
            Last checked: {lastChecked.toLocaleTimeString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
};