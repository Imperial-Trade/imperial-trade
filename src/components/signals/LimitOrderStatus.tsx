
import React, { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { TradeAlertWithProfile } from '@/types/trading';

interface LimitOrderStatusProps {
  signal: TradeAlertWithProfile;
}

export const LimitOrderStatus = memo(({ signal }: LimitOrderStatusProps) => {
  const isLimitOrder = signal.tradeType === 'buy_limit' || signal.tradeType === 'sell_limit';
  const isPending = signal.status === 'pending';
  const isActive = signal.status === 'active';
  const isClosed = signal.status === 'closed';
  const isProfited = signal.status === 'partially_profited';

  return (
    <Card className="w-full">
      <CardContent className="flex items-center space-x-4 p-3">
        {isLimitOrder && isPending && (
          <>
            <Clock className="h-5 w-5 text-yellow-500" />
            <Badge variant="secondary">Limit Order Pending</Badge>
          </>
        )}

        {isActive && (
          <>
            <TrendingUp className="h-5 w-5 text-green-500" />
            <Badge variant="outline">Active</Badge>
          </>
        )}

        {isClosed && (
          <>
            <TrendingDown className="h-5 w-5 text-red-500" />
            <Badge variant="destructive">Closed</Badge>
          </>
        )}

        {isProfited && (
          <>
            <TrendingUp className="h-5 w-5 text-blue-500" />
            <Badge variant="outline">Partially Profited</Badge>
          </>
        )}
      </CardContent>
    </Card>
  );
});

LimitOrderStatus.displayName = 'LimitOrderStatus';
