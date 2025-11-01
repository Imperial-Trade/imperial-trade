import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useOptimizedWebSocketPrices } from '@/contexts/OptimizedWebSocketPriceContext';
import { useGlobalPreviewControl } from '@/contexts/GlobalPreviewControlContext';
import { useSingleTabLeadership } from '@/hooks/useSingleTabLeadership';
import { isDevToolsEnabled } from '@/utils/featureFlags';

export const LivePreviewDiagnostics: React.FC = () => {
  const { 
    connectionStatus, 
    getPrice, 
    getStats, 
    getConnectionHealth,
    restartConnection 
  } = useOptimizedWebSocketPrices();
  
  const { 
    isGlobalLeader, 
    currentLeader, 
    leaderName, 
    participants, 
    isEnforced 
  } = useGlobalPreviewControl();
  
  const { isLeader: isTabLeader, tabId, tabCount } = useSingleTabLeadership();

  // Only show in development
  if (!isDevToolsEnabled()) {
    return null;
  }

  const stats = getStats();
  const health = getConnectionHealth();
  
  // Get sample prices
  const prices = ['XAUUSD', 'BTCUSD'].map(symbol => ({
    symbol,
    data: getPrice(symbol)
  }));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'default';
      case 'connecting': return 'secondary';
      case 'error': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 max-w-sm z-50">
      <Card className="bg-background/95 backdrop-blur border-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            Live Preview Diagnostics
            <Button 
              onClick={restartConnection}
              variant="outline" 
              size="sm"
              className="text-xs h-6"
            >
              Restart WS
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          {/* Global Control Status */}
          <div className="space-y-1">
            <div className="font-medium">Global Control</div>
            <div className="flex items-center gap-2">
              <Badge variant={isGlobalLeader ? 'default' : 'outline'}>
                {isGlobalLeader ? 'Global Leader' : 'Follower'}
              </Badge>
              <span className="text-muted-foreground">
                {isEnforced ? `${participants} devs` : 'Disabled'}
              </span>
            </div>
            {!isGlobalLeader && currentLeader && (
              <div className="text-muted-foreground">
                Leader: {leaderName}
              </div>
            )}
          </div>

          {/* Local Tab Leadership */}
          <div className="space-y-1">
            <div className="font-medium">Local Tabs</div>
            <div className="flex items-center gap-2">
              <Badge variant={isTabLeader ? 'default' : 'outline'}>
                {isTabLeader ? 'Tab Leader' : 'Tab Follower'}
              </Badge>
              <span className="text-muted-foreground">{tabCount} tabs</span>
            </div>
            <div className="text-muted-foreground">ID: {tabId.slice(-6)}</div>
          </div>

          {/* Connection Status */}
          <div className="space-y-1">
            <div className="font-medium">WebSocket</div>
            <div className="flex items-center gap-2">
              <Badge variant={getStatusColor(connectionStatus)}>
                {connectionStatus}
              </Badge>
              <span className="text-muted-foreground">
                {health.isHealthy ? `Connected` : 'Disconnected'}
              </span>
            </div>
          </div>

          {/* Active Subscriptions */}
          <div className="space-y-1">
            <div className="font-medium">Subscriptions</div>
            <div className="text-muted-foreground">
              Active: {Object.keys(prices).length || 0}
            </div>
          </div>

          {/* Sample Prices */}
          <div className="space-y-1">
            <div className="font-medium">Sample Prices</div>
            {prices.map(({ symbol, data }) => (
              <div key={symbol} className="flex justify-between">
                <span>{symbol}:</span>
                <span className={data ? 'text-green-500' : 'text-muted-foreground'}>
                  {data?.price?.toFixed(2) || 'N/A'}
                </span>
              </div>
            ))}
          </div>

          {/* Performance Stats */}
          {stats.messagesReceived > 0 && (
            <div className="space-y-1">
              <div className="font-medium">Performance</div>
              <div className="text-muted-foreground">
                Msgs: {stats.messagesReceived} | Reconnections: {stats.reconnections}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};