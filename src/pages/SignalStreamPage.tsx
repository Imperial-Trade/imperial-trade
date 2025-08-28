import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSignalRealtime } from '@/contexts/SignalRealtimeContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TradeAlertWithProfile } from '@/types/trading';

const SignalStreamPage: React.FC = () => {
  const { user, loading } = useAuth();
  const { signals, connectionStatus, lastUpdated, error, subscribe, unsubscribe, refreshSignals } = useSignalRealtime();
  const [showAllSignals, setShowAllSignals] = useState(false);

  const filteredSignals = useMemo(() => {
    if (showAllSignals) {
      return signals;
    } else if (user) {
      return signals.filter(signal => signal.creator?.id === user.id);
    } else {
      return [];
    }
  }, [signals, user, showAllSignals]);

  useEffect(() => {
    subscribe();
    return () => {
      unsubscribe();
    };
  }, [subscribe, unsubscribe]);

  const handleToggleSignals = useCallback(() => {
    setShowAllSignals(prev => !prev);
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>
            Signal Stream
            {connectionStatus !== 'connected' && (
              <Badge variant="secondary" className="ml-2">
                {connectionStatus}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && <div className="text-red-500">Error: {error}</div>}
          <div className="mb-4">
            <Button onClick={handleToggleSignals}>
              {showAllSignals ? 'Show My Signals' : 'Show All Signals'}
            </Button>
          </div>
          {filteredSignals.map(signal => (
            <div key={signal.id} className="mb-4 p-4 border rounded-md">
              <p>Asset: {signal.assetName}</p>
              <p>Type: {signal.tradeType}</p>
              <p>Entry Price: {signal.entryPrice}</p>
              <p>Status: {signal.status}</p>
              <p>Created By: {signal.creator?.display_name || 'Unknown'}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default SignalStreamPage;
