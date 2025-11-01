import React, { useMemo } from 'react';
import { useOptimizedWebSocketPrices } from '@/contexts/OptimizedWebSocketPriceContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface WebSocketDiagnosticsProps {
  symbols?: string[];
}


export default function WebSocketDiagnostics({ symbols = [] }: WebSocketDiagnosticsProps) {
  const { connectionStatus, dataSource, prices } = useOptimizedWebSocketPrices();

  const subscribedCount = useMemo(() => symbols.length, [symbols]);
  const priceKeys = useMemo(() => Object.keys(prices || {}), [prices]);

  return (
    <Card className="p-3 md:p-4 bg-card border-border">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            WS: {connectionStatus}
          </Badge>
          <Badge variant="secondary">Source: {dataSource}</Badge>
          <Badge variant="outline">Subs: {subscribedCount}</Badge>
          <Badge variant="outline">Prices: {priceKeys.length}</Badge>
        </div>
      </div>
    </Card>
  );
}
