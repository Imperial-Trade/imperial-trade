import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthorizationAware } from '@/hooks/useAuthorizationAware';
import { Loader2, Activity, Lock, Users, Radio, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface BroadcastLock {
  id: string;
  holder_id: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

interface UIListener {
  id: string;
  user_id: string;
  last_seen_at: string;
  created_at: string;
}

interface EdgeFunctionTelemetry {
  id: string;
  function_name: string;
  metric: string;
  count: number;
  metadata: any;
  created_at: string;
}

const RealtimeOptimizationDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [broadcastLock, setBroadcastLock] = useState<BroadcastLock | null>(null);
  const [uiListeners, setUIListeners] = useState<UIListener[]>([]);
  const [telemetry, setTelemetry] = useState<EdgeFunctionTelemetry[]>([]);
  const [error, setError] = useState<string | null>(null);

  // ✅ SECURITY FIX (ERROR #40): Use secure RPC-based authorization
  const { isAdmin } = useAuthorizationAware();

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
              <p>Access denied. Admin privileges required.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch broadcast lock
      const { data: lockData, error: lockError } = await supabase
        .from('price_broadcast_lock')
        .select('*')
        .eq('id', 'singleton')
        .maybeSingle();

      if (lockError) {
        console.error('Lock fetch error:', lockError);
      } else {
        setBroadcastLock(lockData);
      }

      // Fetch UI listeners (active within last 5 minutes)
      const { data: listenersData, error: listenersError } = await supabase
        .from('ui_price_listeners')
        .select('*')
        .gte('last_seen_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
        .order('last_seen_at', { ascending: false });

      if (listenersError) {
        console.error('Listeners fetch error:', listenersError);
      } else {
        setUIListeners(listenersData || []);
      }

      // Fetch recent telemetry
      const { data: telemetryData, error: telemetryError } = await supabase
        .from('edge_function_telemetry')
        .select('*')
        .eq('function_name', 'price-ingestor')
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
        .order('created_at', { ascending: false })
        .limit(20);

      if (telemetryError) {
        console.error('Telemetry fetch error:', telemetryError);
      } else {
        setTelemetry(telemetryData || []);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchData();
      const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [isAdmin]);

  const isLockActive = broadcastLock && new Date(broadcastLock.expires_at) > new Date();
  const activeListenerCount = uiListeners.length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Realtime Optimization Dashboard</h1>
          <p className="text-muted-foreground">Monitor broadcast locks, UI listeners, and system health</p>
        </div>
        <Button onClick={fetchData} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="text-destructive">
              <AlertTriangle className="h-4 w-4 inline mr-2" />
              {error}
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Broadcast Lock</CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">
              <Badge variant={isLockActive ? "default" : "secondary"}>
                {isLockActive ? 'ACTIVE' : 'AVAILABLE'}
              </Badge>
            </div>
            {broadcastLock && (
              <div className="text-xs text-muted-foreground">
                <div>Holder: {broadcastLock.holder_id.split('-')[0]}...</div>
                <div>Expires: {format(new Date(broadcastLock.expires_at), 'HH:mm:ss')}</div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active UI Listeners</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeListenerCount}</div>
            <p className="text-xs text-muted-foreground">
              Users with active heartbeats
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Radio className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Badge variant={isLockActive && activeListenerCount > 0 ? "default" : "secondary"}>
                {isLockActive && activeListenerCount > 0 ? 'BROADCASTING' : 'IDLE'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Broadcasting requires lock + listeners
            </p>
          </CardContent>
        </Card>
      </div>

      {/* UI Listeners Details */}
      <Card>
        <CardHeader>
          <CardTitle>Active UI Listeners</CardTitle>
          <CardDescription>Users currently listening for price updates</CardDescription>
        </CardHeader>
        <CardContent>
          {uiListeners.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No active listeners detected</p>
          ) : (
            <div className="space-y-2">
              {uiListeners.map(listener => (
                <div key={listener.id} className="flex items-center justify-between p-2 rounded border">
                  <span className="text-sm">{listener.user_id.split('-')[0]}...</span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(listener.last_seen_at), 'HH:mm:ss')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Telemetry */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Edge Function Activity</CardTitle>
          <CardDescription>Price ingestor telemetry from the last hour</CardDescription>
        </CardHeader>
        <CardContent>
          {telemetry.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No recent telemetry data</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {telemetry.map(entry => (
                <div key={entry.id} className="flex items-center justify-between p-2 rounded border text-sm">
                  <div>
                    <Badge variant="outline" className="mr-2">{entry.metric}</Badge>
                    <span>Count: {entry.count}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(entry.created_at), 'HH:mm:ss')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RealtimeOptimizationDashboard;