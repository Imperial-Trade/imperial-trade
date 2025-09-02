import React, { useEffect, useState } from 'react';
import { useWebSocketPrices } from '@/contexts/WebSocketPriceContext';
import { testTradermadeHealth, runLeaderHealthProbe } from '@/test-tradermade-health';

export const PriceDebugWidget: React.FC = () => {
  const { prices, connectionStatus, dataSource, lastUpdated, errors, subscribe } = useWebSocketPrices();
  const [healthData, setHealthData] = useState<any>(null);
  const [leaderProbeData, setLeaderProbeData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [probeLoading, setProbeLoading] = useState(false);

  const symbols = ['XAUUSD', 'BTCUSD', 'EURUSD'];

  useEffect(() => {
    // Subscribe to some test symbols
    console.log('🎯 Debug widget subscribing to symbols:', symbols);
    subscribe(symbols);
  }, [subscribe]);

  const testHealth = async () => {
    setLoading(true);
    try {
      const result = await testTradermadeHealth();
      setHealthData(result);
      console.log('🎯 Health test result:', result);
    } catch (error) {
      console.error('❌ Health test failed:', error);
      setHealthData({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const runLeaderProbe = async () => {
    setProbeLoading(true);
    try {
      const results = await runLeaderHealthProbe();
      setLeaderProbeData(results);
      console.log('🎯 Leader probe results:', results);
    } catch (error) {
      console.error('❌ Leader probe failed:', error);
      setLeaderProbeData([{ error: error.message }]);
    } finally {
      setProbeLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-background border rounded-lg p-4 shadow-lg max-w-md z-50">
      <h3 className="text-sm font-semibold mb-2">Price Debug</h3>
      
      <div className="space-y-2 text-xs">
        <div>Status: <span className={`font-mono ${connectionStatus === 'connected' ? 'text-green-600' : 'text-red-600'}`}>{connectionStatus}</span></div>
        <div>Source: <span className="font-mono">{dataSource}</span></div>
        <div>Last Update: <span className="font-mono">{lastUpdated?.toLocaleTimeString() || 'Never'}</span></div>
        
        <div className="border-t pt-2">
          <div className="font-medium mb-1">Prices:</div>
          {symbols.map(symbol => (
            <div key={symbol} className="flex justify-between">
              <span>{symbol}:</span>
              <span className={`font-mono ${prices[symbol] ? 'text-green-600' : 'text-gray-400'}`}>
                {prices[symbol]?.price?.toFixed(4) || 'N/A'}
              </span>
            </div>
          ))}
        </div>
        
        {Object.keys(errors).length > 0 && (
          <div className="border-t pt-2">
            <div className="font-medium mb-1 text-red-600">Errors:</div>
            {Object.entries(errors).map(([key, error]) => (
              <div key={key} className="text-red-600">{key}: {error}</div>
            ))}
          </div>
        )}
        
        <div className="flex gap-1 mb-2">
          <button 
            onClick={testHealth}
            disabled={loading}
            className="flex-1 bg-primary text-primary-foreground px-2 py-1 rounded text-xs hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Health'}
          </button>
          
          <button 
            onClick={runLeaderProbe}
            disabled={probeLoading}
            className="flex-1 bg-secondary text-secondary-foreground px-2 py-1 rounded text-xs hover:bg-secondary/90 disabled:opacity-50"
          >
            {probeLoading ? 'Probe...' : 'Leader Probe'}
          </button>
        </div>
        
        {healthData && (
          <div className="border-t pt-2">
            <div className="font-medium mb-1">Health:</div>
            <pre className="text-xs overflow-x-auto whitespace-pre-wrap max-h-40 overflow-y-auto">
              {JSON.stringify(healthData, null, 1)}
            </pre>
          </div>
        )}
        
        {leaderProbeData && (
          <div className="border-t pt-2">
            <div className="font-medium mb-1">Leader Probe:</div>
            <div className="text-xs space-y-1 max-h-48 overflow-y-auto">
              {leaderProbeData.map((result: any, index: number) => (
                <div key={index} className="bg-muted/50 p-2 rounded">
                  <div className="font-semibold">Probe {result.probe} - {new Date(result.timestamp).toLocaleTimeString()}</div>
                  {result.error ? (
                    <div className="text-destructive">Error: {result.error}</div>
                  ) : (
                    <div className="space-y-1 mt-1">
                      <div><strong>Headers:</strong> {result.headers['X-Health-Source']} | {result.headers['X-Responder-Instance']}</div>
                      <div><strong>Upstream:</strong> {String(result.metrics.upstreamConnected)} | WS: {result.metrics.ws_updates_total} | Broadcasts: {result.metrics.realtime_broadcasts_total}</div>
                      <div><strong>Redis:</strong> pub:{String(result.metrics.redis_publisher_connected)} sub:{String(result.metrics.redis_subscriber_connected)}</div>
                      <div><strong>XAUUSD:</strong> {result.metrics.xauusd_freshness}ms | {result.metrics.xauusd_ticks_per_sec}/s</div>
                      <div><strong>BTCUSD:</strong> {result.metrics.btcusd_freshness}ms | {result.metrics.btcusd_ticks_per_sec}/s</div>
                      <div><strong>Leader:</strong> {String(result.metrics.leader_is_leader)} | {result.metrics.leader_instance_id}</div>
                      {result.metrics.snapshot_age_ms && (
                        <div><strong>Snapshot Age:</strong> {result.metrics.snapshot_age_ms}ms</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};