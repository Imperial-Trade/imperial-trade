
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TradeAlert {
  id: string;
  asset_name: string;
  trade_type: string;
  status: string;
  entry_price: number;
  created_at: string;
  activated_at?: string;
  activation_price?: number;
}

const LimitOrderStatusDebug: React.FC = () => {
  const [recentLimitOrders, setRecentLimitOrders] = useState<TradeAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentLimitOrders = async () => {
      try {
        const { data, error } = await supabase
          .from('trade_alerts')
          .select('id, asset_name, trade_type, status, entry_price, created_at, activated_at, activation_price')
          .in('trade_type', ['buy_limit', 'sell_limit'])
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) {
          console.error('Error fetching limit orders:', error);
        } else {
          setRecentLimitOrders(data || []);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentLimitOrders();
  }, []);

  if (loading) {
    return <div className="p-4">Loading limit order debug info...</div>;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Limit Order Status Debug</CardTitle>
      </CardHeader>
      <CardContent>
        {recentLimitOrders.length === 0 ? (
          <p className="text-muted-foreground">No recent limit orders found.</p>
        ) : (
          <div className="space-y-3">
            {recentLimitOrders.map((order) => (
              <div key={order.id} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">{order.asset_name}</div>
                  <div className="flex gap-2">
                    <Badge variant={order.trade_type === 'buy_limit' ? 'default' : 'secondary'}>
                      {order.trade_type}
                    </Badge>
                    <Badge variant={order.status === 'pending' ? 'outline' : 'default'}>
                      {order.status}
                    </Badge>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>Entry Price: ${order.entry_price}</div>
                  <div>Created: {new Date(order.created_at).toLocaleString()}</div>
                  {order.activated_at && (
                    <div className="text-green-600">
                      Activated: {new Date(order.activated_at).toLocaleString()}
                      {order.activation_price && ` at $${order.activation_price}`}
                    </div>
                  )}
                  {order.status === 'active' && !order.activated_at && (
                    <div className="text-red-600 font-medium">
                      ⚠️ Status is 'active' but no activation timestamp - possible bug!
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LimitOrderStatusDebug;
