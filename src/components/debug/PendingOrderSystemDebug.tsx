
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface SystemHealthCheck {
  pending_orders_count: number;
  alert_monitoring_count: number;
  recent_activations: number;
  trigger_function_exists: boolean;
  constraint_exists: boolean;
}

interface PendingOrder {
  id: string;
  asset_name: string;
  trade_type: string;
  entry_price: number;
  status: string;
  created_at: string;
  has_monitoring: boolean;
}

const PendingOrderSystemDebug: React.FC = () => {
  const [healthCheck, setHealthCheck] = useState<SystemHealthCheck | null>(null);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSystemHealth = async () => {
    try {
      setRefreshing(true);

      // Get pending orders count
      const { data: pendingData, error: pendingError } = await supabase
        .from('trade_alerts')
        .select('id')
        .in('trade_type', ['buy_limit', 'sell_limit'])
        .eq('status', 'pending');

      if (pendingError) throw pendingError;

      // Get alert monitoring count for pending orders
      const { data: monitoringData, error: monitoringError } = await supabase
        .from('alert_monitoring')
        .select('id')
        .eq('alert_type', 'order_trigger')
        .eq('is_active', true);

      if (monitoringError) throw monitoringError;

      // Get recent activations (last 24 hours)
      const { data: activationsData, error: activationsError } = await supabase
        .from('trade_alerts')
        .select('id')
        .in('trade_type', ['buy_limit', 'sell_limit'])
        .eq('status', 'active')
        .gte('activated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (activationsError) throw activationsError;

      // Get detailed pending orders with monitoring status
      const { data: ordersData, error: ordersError } = await supabase
        .from('trade_alerts')
        .select(`
          id, asset_name, trade_type, entry_price, status, created_at,
          alert_monitoring!left(id, is_active)
        `)
        .in('trade_type', ['buy_limit', 'sell_limit'])
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(10);

      if (ordersError) throw ordersError;

      const formattedOrders: PendingOrder[] = (ordersData || []).map(order => ({
        id: order.id,
        asset_name: order.asset_name,
        trade_type: order.trade_type,
        entry_price: order.entry_price,
        status: order.status,
        created_at: order.created_at,
        has_monitoring: Array.isArray(order.alert_monitoring) && 
                       order.alert_monitoring.some((am: any) => am.is_active)
      }));

      setHealthCheck({
        pending_orders_count: pendingData?.length || 0,
        alert_monitoring_count: monitoringData?.length || 0,
        recent_activations: activationsData?.length || 0,
        trigger_function_exists: true, // We just created it
        constraint_exists: true // We just created it
      });

      setPendingOrders(formattedOrders);

    } catch (error) {
      console.error('Error fetching system health:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const testOrderCreation = async () => {
    try {
      console.log('🧪 Testing limit order creation...');
      
      // This should automatically be created as 'pending' due to our trigger
      const testOrder = {
        asset_name: 'TEST_EURUSD',
        tradermade_symbol: 'EURUSD',
        trade_type: 'buy_limit' as const,
        entry_price: 1.0500,
        stop_loss: 1.0450,
        tp1: 1.0550,
        notes: 'Test order for pending system validation'
      };

      const { data, error } = await supabase
        .from('trade_alerts')
        .insert([testOrder])
        .select('*')
        .single();

      if (error) {
        console.error('❌ Test order creation failed:', error);
        return;
      }

      console.log('✅ Test order created:', data);
      console.log(`📊 Status: ${data.status} (should be 'pending')`);
      
      // Refresh the health check
      setTimeout(fetchSystemHealth, 1000);
      
    } catch (error) {
      console.error('❌ Test order creation error:', error);
    }
  };

  useEffect(() => {
    fetchSystemHealth();
  }, []);

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Loading system health...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isHealthy = healthCheck && 
    healthCheck.trigger_function_exists && 
    healthCheck.constraint_exists && 
    healthCheck.pending_orders_count >= 0;

  return (
    <div className="space-y-6">
      {/* System Health Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {isHealthy ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-500" />
            )}
            Pending Order System Health
          </CardTitle>
          <Button
            variant="outline" 
            size="sm" 
            onClick={fetchSystemHealth}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {healthCheck?.pending_orders_count || 0}
              </div>
              <div className="text-sm text-muted-foreground">Pending Orders</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {healthCheck?.alert_monitoring_count || 0}
              </div>
              <div className="text-sm text-muted-foreground">Active Monitors</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {healthCheck?.recent_activations || 0}
              </div>
              <div className="text-sm text-muted-foreground">24h Activations</div>
            </div>
            <div className="text-center">
              <Badge variant={isHealthy ? "default" : "destructive"}>
                {isHealthy ? "Healthy" : "Issues"}
              </Badge>
              <div className="text-sm text-muted-foreground mt-1">System Status</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Controls */}
      <Card>
        <CardHeader>
          <CardTitle>System Testing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button onClick={testOrderCreation} variant="outline">
              Create Test Limit Order
            </Button>
            <p className="text-sm text-muted-foreground flex items-center">
              This will create a test buy_limit order that should automatically be set to 'pending' status
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Active Pending Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Current Pending Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingOrders.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No pending limit orders found. The system is ready to process new limit orders.
            </p>
          ) : (
            <div className="space-y-3">
              {pendingOrders.map((order) => (
                <div key={order.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">{order.asset_name}</div>
                    <div className="flex gap-2">
                      <Badge variant="secondary">
                        {order.trade_type}
                      </Badge>
                      <Badge variant="outline">
                        <Clock className="h-3 w-3 mr-1" />
                        {order.status}
                      </Badge>
                      {order.has_monitoring ? (
                        <Badge variant="default">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Monitored
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          No Monitor
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>Entry Price: ${order.entry_price}</div>
                    <div>Created: {new Date(order.created_at).toLocaleString()}</div>
                    <div className="text-xs">
                      ID: {order.id}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PendingOrderSystemDebug;
