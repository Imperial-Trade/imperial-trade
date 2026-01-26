import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  AlertTriangle, 
  RefreshCw,
  CheckCircle,
  XCircle,
  Users,
  Bell,
  BellOff,
  Trash2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface InvalidSubscription {
  user_id: string;
  display_name: string | null;
  email: string | null;
  xeon_stream_subscription: boolean;
  profile_device_token: string | null;
  user_created_at: string;
  active_devices_count: number;
  devices_with_player_id: number;
  subscription_status: string;
}

interface Stats {
  total_subscribed: number;
  valid_subscriptions: number;
  invalid_subscriptions: number;
  not_subscribed: number;
}

export function InvalidSubscriptionMonitor() {
  const [subscriptions, setSubscriptions] = useState<InvalidSubscription[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Fetch from the invalid_subscriptions view
      const { data, error } = await supabase
        .from('invalid_subscriptions')
        .select('*');

      if (error) {
        // View might not exist yet, try manual query
        console.warn('View not available, using manual query:', error);
        await loadDataManually();
        return;
      }

      setSubscriptions(data || []);

      // Calculate stats
      const statsData: Stats = {
        total_subscribed: (data || []).filter(s => s.xeon_stream_subscription).length,
        valid_subscriptions: (data || []).filter(s => s.subscription_status === 'VALID').length,
        invalid_subscriptions: (data || []).filter(s => s.subscription_status === 'INVALID - No Player ID').length,
        not_subscribed: (data || []).filter(s => s.subscription_status === 'NOT SUBSCRIBED').length,
      };
      setStats(statsData);

    } catch (error) {
      console.error('Failed to load subscription data:', error);
      toast({
        title: "Error",
        description: "Failed to load subscription data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadDataManually = async () => {
    try {
      // Manual query if view doesn't exist
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, email, xeon_stream_subscription, device_token, created_at')
        .eq('account_status', 'active');

      if (profilesError) throw profilesError;

      const { data: devices, error: devicesError } = await supabase
        .from('device_subscriptions')
        .select('user_id, is_active, onesignal_player_id');

      if (devicesError) throw devicesError;

      // Build device counts
      const deviceCounts = new Map<string, { active: number; withPlayerId: number }>();
      (devices || []).forEach(d => {
        const counts = deviceCounts.get(d.user_id) || { active: 0, withPlayerId: 0 };
        if (d.is_active) counts.active++;
        if (d.is_active && d.onesignal_player_id) counts.withPlayerId++;
        deviceCounts.set(d.user_id, counts);
      });

      // Build subscription list
      const subscriptionList: InvalidSubscription[] = (profiles || []).map(p => {
        const counts = deviceCounts.get(p.id) || { active: 0, withPlayerId: 0 };
        let status = 'NOT SUBSCRIBED';
        if (p.xeon_stream_subscription) {
          status = counts.withPlayerId > 0 ? 'VALID' : 'INVALID - No Player ID';
        }

        return {
          user_id: p.id,
          display_name: p.display_name,
          email: p.email,
          xeon_stream_subscription: p.xeon_stream_subscription || false,
          profile_device_token: p.device_token,
          user_created_at: p.created_at,
          active_devices_count: counts.active,
          devices_with_player_id: counts.withPlayerId,
          subscription_status: status,
        };
      });

      // Sort: invalid first, then by created_at
      subscriptionList.sort((a, b) => {
        if (a.subscription_status.includes('INVALID') && !b.subscription_status.includes('INVALID')) return -1;
        if (!a.subscription_status.includes('INVALID') && b.subscription_status.includes('INVALID')) return 1;
        return new Date(b.user_created_at).getTime() - new Date(a.user_created_at).getTime();
      });

      setSubscriptions(subscriptionList);

      // Calculate stats
      const statsData: Stats = {
        total_subscribed: subscriptionList.filter(s => s.xeon_stream_subscription).length,
        valid_subscriptions: subscriptionList.filter(s => s.subscription_status === 'VALID').length,
        invalid_subscriptions: subscriptionList.filter(s => s.subscription_status === 'INVALID - No Player ID').length,
        not_subscribed: subscriptionList.filter(s => s.subscription_status === 'NOT SUBSCRIBED').length,
      };
      setStats(statsData);

    } catch (error) {
      console.error('Manual query failed:', error);
      throw error;
    }
  };

  const resetInvalidSubscription = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          xeon_stream_subscription: false,
          device_token: null,
          device_platform: null,
          device_token_updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Subscription Reset",
        description: "User will be prompted to subscribe again.",
      });

      loadData();
    } catch (error) {
      console.error('Failed to reset subscription:', error);
      toast({
        title: "Error",
        description: "Failed to reset subscription",
        variant: "destructive"
      });
    }
  };

  const resetAllInvalidSubscriptions = async () => {
    setIsResetting(true);
    try {
      const invalidUsers = subscriptions.filter(s => 
        s.subscription_status === 'INVALID - No Player ID'
      );

      let resetCount = 0;
      for (const user of invalidUsers) {
        const { error } = await supabase
          .from('profiles')
          .update({
            xeon_stream_subscription: false,
            device_token: null,
            device_platform: null,
            device_token_updated_at: new Date().toISOString()
          })
          .eq('id', user.user_id);

        if (!error) resetCount++;
      }

      toast({
        title: "Subscriptions Reset",
        description: `Reset ${resetCount} invalid subscriptions. Users will be prompted to subscribe again.`,
      });

      loadData();
    } catch (error) {
      console.error('Failed to reset all subscriptions:', error);
      toast({
        title: "Error",
        description: "Failed to reset subscriptions",
        variant: "destructive"
      });
    } finally {
      setIsResetting(false);
    }
  };

  const invalidSubscriptions = subscriptions.filter(s => 
    s.subscription_status === 'INVALID - No Player ID'
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          Loading subscription data...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Subscribed</p>
                  <p className="text-2xl font-bold">{stats.total_subscribed}</p>
                </div>
                <Users className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Valid (with Player ID)</p>
                  <p className="text-2xl font-bold text-green-500">{stats.valid_subscriptions}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className={stats.invalid_subscriptions > 0 ? 'border-red-500/50' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Invalid (no Player ID)</p>
                  <p className="text-2xl font-bold text-red-500">{stats.invalid_subscriptions}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Not Subscribed</p>
                  <p className="text-2xl font-bold text-muted-foreground">{stats.not_subscribed}</p>
                </div>
                <BellOff className="h-8 w-8 text-muted-foreground opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Invalid Subscriptions Alert */}
      {invalidSubscriptions.length > 0 && (
        <Card className="border-red-500/50 bg-red-500/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <CardTitle className="text-red-500">
                  {invalidSubscriptions.length} Invalid Subscription{invalidSubscriptions.length > 1 ? 's' : ''}
                </CardTitle>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={isResetting}>
                    {isResetting ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-2" />
                    )}
                    Reset All Invalid
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset All Invalid Subscriptions?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will reset {invalidSubscriptions.length} user(s) who have subscriptions but no Player ID.
                      They will be prompted to subscribe again when they visit the app.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={resetAllInvalidSubscriptions}>
                      Reset All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            <CardDescription>
              These users are marked as subscribed but have no Player ID, so they won't receive push notifications.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-red-500/30">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Devices</TableHead>
                    <TableHead>Profile Token</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invalidSubscriptions.map((sub) => (
                    <TableRow key={sub.user_id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{sub.display_name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{sub.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <span className="text-red-500 font-medium">{sub.devices_with_player_id}</span>
                          <span className="text-muted-foreground"> / {sub.active_devices_count} with Player ID</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">
                          {sub.profile_device_token 
                            ? sub.profile_device_token.substring(0, 12) + '...'
                            : 'NULL'}
                        </code>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(sub.user_created_at), { addSuffix: true })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => resetInvalidSubscription(sub.user_id)}
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Reset
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Subscriptions List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                All Subscriptions
              </CardTitle>
              <CardDescription>
                Overview of all user push notification subscriptions
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Active Devices</TableHead>
                  <TableHead>With Player ID</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.slice(0, 50).map((sub) => (
                  <TableRow key={sub.user_id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{sub.display_name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{sub.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {sub.subscription_status === 'VALID' && (
                        <Badge className="bg-green-500">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Valid
                        </Badge>
                      )}
                      {sub.subscription_status === 'INVALID - No Player ID' && (
                        <Badge variant="destructive">
                          <XCircle className="h-3 w-3 mr-1" />
                          Invalid
                        </Badge>
                      )}
                      {sub.subscription_status === 'NOT SUBSCRIBED' && (
                        <Badge variant="secondary">
                          <BellOff className="h-3 w-3 mr-1" />
                          Not Subscribed
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{sub.active_devices_count}</span>
                    </TableCell>
                    <TableCell>
                      <span className={sub.devices_with_player_id > 0 ? 'text-green-500 font-medium' : 'text-red-500'}>
                        {sub.devices_with_player_id}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(sub.user_created_at), { addSuffix: true })}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {subscriptions.length > 50 && (
            <p className="text-sm text-muted-foreground text-center mt-4">
              Showing 50 of {subscriptions.length} users
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}



