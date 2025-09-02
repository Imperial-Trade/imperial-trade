import React, { useEffect, useState } from 'react';
import { useWebSocketPrices } from '@/contexts/WebSocketPriceContext';
import { testTradermadeHealth } from '@/test-tradermade-health';

export const PriceDebugWidget: React.FC = () => {
  const { prices, connectionStatus, dataSource, lastUpdated, errors, subscribe } = useWebSocketPrices();
  const [healthData, setHealthData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

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
        
        <button 
          onClick={testHealth}
          disabled={loading}
          className="w-full bg-primary text-primary-foreground px-2 py-1 rounded text-xs hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Health'}
        </button>
        
        {healthData && (
          <div className="border-t pt-2">
            <div className="font-medium mb-1">Health:</div>
            <pre className="text-xs overflow-x-auto whitespace-pre-wrap max-h-40 overflow-y-auto">
              {JSON.stringify(healthData, null, 1)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};