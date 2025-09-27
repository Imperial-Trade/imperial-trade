import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, RefreshCw, Activity, TrendingUp, TrendingDown, Clock } from 'lucide-react';

interface SignalCounts {
  all: number;
  active: number;
  closed: number;
  pending: number;
  buy: number;
  sell: number;
}

interface SignalStreamHeaderProps {
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error' | 'polling-fallback';
  lastUpdated?: Date | null;
  signalCounts: SignalCounts;
  canCreateSignals: boolean;
  onCreateSignal: () => void;
  onRefresh: () => void;
}

export default function SignalStreamHeader({
  connectionStatus,
  lastUpdated,
  signalCounts,
  canCreateSignals,
  onCreateSignal,
  onRefresh
}: SignalStreamHeaderProps) {
  const formatTime = (date?: Date | null) => {
    if (!date) return 'Never';
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-bold">Signal Stream</CardTitle>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRefresh}
              disabled={connectionStatus === 'connecting'}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            {canCreateSignals && (
              <Button onClick={onCreateSignal}>
                <Plus className="h-4 w-4 mr-2" />
                Create Signal
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Activity className="h-4 w-4 mr-1 text-primary" />
            </div>
            <div className="text-2xl font-bold">{signalCounts.all}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Badge variant="default" className="text-xs">Active</Badge>
            </div>
            <div className="text-2xl font-bold text-green-600">{signalCounts.active}</div>
            <div className="text-sm text-muted-foreground">Active</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Clock className="h-4 w-4 mr-1 text-yellow-600" />
            </div>
            <div className="text-2xl font-bold text-yellow-600">{signalCounts.pending}</div>
            <div className="text-sm text-muted-foreground">Pending</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Badge variant="secondary" className="text-xs">Closed</Badge>
            </div>
            <div className="text-2xl font-bold text-muted-foreground">{signalCounts.closed}</div>
            <div className="text-sm text-muted-foreground">Closed</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <TrendingUp className="h-4 w-4 mr-1 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-600">{signalCounts.buy}</div>
            <div className="text-sm text-muted-foreground">Buy</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <TrendingDown className="h-4 w-4 mr-1 text-red-600" />
            </div>
            <div className="text-2xl font-bold text-red-600">{signalCounts.sell}</div>
            <div className="text-sm text-muted-foreground">Sell</div>
          </div>
        </div>

        <div className="mt-4 text-center text-sm text-muted-foreground">
          Last updated: {formatTime(lastUpdated)} • Status: {connectionStatus}
        </div>
      </CardContent>
    </Card>
  );
}