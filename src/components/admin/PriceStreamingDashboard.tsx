import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useWebSocketPrices } from '@/contexts/WebSocketPriceContext';
import { Activity, AlertTriangle, CheckCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';

interface EdgeFunctionHealth {
  status: string;
  timestamp: number;
  connections: {
    clients: number;
    tradermade: number;
  };
  apiKeys: Record<string, any>;
  subscriptions: {
    active: string[];
    pending: string[];
    refCounts: Record<string, number>;
  };
  cache: {
    symbols: number;
    sequenceNumber: number;
  };
}

export const PriceStreamingDashboard: React.FC = () => {
  const { connectionStatus, prices, errors, priceUpdateSources } = useWebSocketPrices();
  const [edgeHealth, setEdgeHealth] = useState<EdgeFunctionHealth | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, any>>({});

  // Fetch edge function health status
  const fetchEdgeHealth = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/tradermade-fix-streaming/health'
      );
      
      if (response.ok) {
        const data = await response.json();
        setEdgeHealth(data);
      } else {
        console.error('Failed to fetch edge health:', response.status);
      }
    } catch (error) {
      console.error('Error fetching edge health:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Test specific symbol subscription
  const testSymbolSubscription = async (symbol: string) => {
    console.log(`🧪 Testing ${symbol} subscription...`);
    setTestResults(prev => ({ ...prev, [symbol]: { status: 'testing', startTime: Date.now() } }));

    // Track if we receive a price update within 10 seconds
    const testTimeout = setTimeout(() => {
      setTestResults(prev => ({
        ...prev,
        [symbol]: {
          status: 'failed',
          error: 'No price update received within 10 seconds',
          duration: 10000
        }
      }));
    }, 10000);

    // Listen for price updates
    const checkForUpdate = () => {
      const currentPrice = prices[symbol];
      if (currentPrice && currentPrice.timestamp) {
        const updateTime = new Date(currentPrice.timestamp).getTime();
        const testStartTime = testResults[symbol]?.startTime || Date.now();
        
        if (updateTime >= testStartTime) {
          clearTimeout(testTimeout);
          setTestResults(prev => ({
            ...prev,
            [symbol]: {
              status: 'success',
              duration: Date.now() - testStartTime,
              price: currentPrice.price,
              source: priceUpdateSources[symbol]
            }
          }));
        }
      }
    };

    // Check immediately and then every 500ms
    const interval = setInterval(checkForUpdate, 500);
    setTimeout(() => clearInterval(interval), 10000);
  };

  useEffect(() => {
    fetchEdgeHealth();
    const interval = setInterval(fetchEdgeHealth, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Crypto symbols to prioritize and test
  const cryptoSymbols = ['BTCUSD', 'ETHUSD'];
  const forexSymbols = ['EURUSD', 'GBPUSD'];
  const commoditySymbols = ['XAUUSD'];

  const getSymbolStatus = (symbol: string) => {
    const price = prices[symbol];
    const error = errors[symbol];
    const source = priceUpdateSources[symbol];
    
    if (error) return { status: 'error', color: 'destructive', message: error };
    if (!price) return { status: 'no_data', color: 'secondary', message: 'No price data' };
    
    const age = Date.now() - new Date(price.timestamp).getTime();
    const isCrypto = symbol.includes('BTC') || symbol.includes('ETH');
    const staleThreshold = isCrypto ? 5000 : 30000; // 5s for crypto, 30s for others
    
    if (age > staleThreshold) {
      return { status: 'stale', color: 'secondary', message: `Stale (${Math.floor(age / 1000)}s)` };
    }
    
    if (source === 'http') {
      return { status: 'fallback', color: 'secondary', message: 'REST fallback' };
    }
    
    return { status: 'live', color: 'default', message: 'Live' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Price Streaming Dashboard</h1>
        <Button onClick={fetchEdgeHealth} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Connection Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">WebSocket Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {connectionStatus === 'connected' ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : connectionStatus === 'connecting' ? (
                <Activity className="h-4 w-4 text-yellow-500 animate-pulse" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              <span className="capitalize">{connectionStatus}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Edge Function</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {edgeHealth ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-500" />
              )}
              <span>{edgeHealth ? 'Healthy' : 'Unreachable'}</span>
            </div>
            {edgeHealth && (
              <div className="text-xs text-muted-foreground mt-1">
                {edgeHealth.connections.clients} clients, {edgeHealth.cache.symbols} cached
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Price Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {Object.keys(prices).length} symbols active
            </div>
            <div className="text-xs text-muted-foreground">
              {Object.values(priceUpdateSources).filter(s => s === 'websocket_institutional').length} institutional feeds
            </div>
          </CardContent>
        </Card>
      </div>

      {/* API Key Health */}
      {edgeHealth?.apiKeys && (
        <Card>
          <CardHeader>
            <CardTitle>TraderMade API Key Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(edgeHealth.apiKeys).map(([index, health]: [string, any]) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">API Key {index}</span>
                    <Badge variant={health.isActive ? 'default' : 'destructive'}>
                      {health.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <div>Failures: {health.failures}</div>
                    <div>Last Success: {new Date(health.lastSuccess).toLocaleTimeString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Symbol Testing */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Crypto Symbols */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>🪙 Crypto Symbols</span>
              <Badge variant="outline">High Priority</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {cryptoSymbols.map(symbol => {
              const status = getSymbolStatus(symbol);
              const test = testResults[symbol];
              
              return (
                <div key={symbol} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <div className="font-medium">{symbol}</div>
                    <div className="text-sm text-muted-foreground">
                      {prices[symbol] ? `$${prices[symbol].price.toFixed(2)}` : 'No data'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={status.color as any}>{status.message}</Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => testSymbolSubscription(symbol)}
                      disabled={test?.status === 'testing'}
                    >
                      {test?.status === 'testing' ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : (
                        'Test'
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Forex Symbols */}
        <Card>
          <CardHeader>
            <CardTitle>💱 Forex Symbols</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {forexSymbols.map(symbol => {
              const status = getSymbolStatus(symbol);
              
              return (
                <div key={symbol} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <div className="font-medium">{symbol}</div>
                    <div className="text-sm text-muted-foreground">
                      {prices[symbol] ? `$${prices[symbol].price.toFixed(5)}` : 'No data'}
                    </div>
                  </div>
                  <Badge variant={status.color as any}>{status.message}</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Commodity Symbols */}
        <Card>
          <CardHeader>
            <CardTitle>🏆 Commodities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {commoditySymbols.map(symbol => {
              const status = getSymbolStatus(symbol);
              
              return (
                <div key={symbol} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <div className="font-medium">{symbol}</div>
                    <div className="text-sm text-muted-foreground">
                      {prices[symbol] ? `$${prices[symbol].price.toFixed(2)}` : 'No data'}
                    </div>
                  </div>
                  <Badge variant={status.color as any}>{status.message}</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Test Results */}
      {Object.keys(testResults).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(testResults).map(([symbol, result]: [string, any]) => (
                <div key={symbol} className="flex items-center justify-between p-2 border rounded">
                  <span className="font-medium">{symbol}</span>
                  <div className="flex items-center gap-2">
                    {result.status === 'testing' && (
                      <Badge variant="secondary">
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                        Testing...
                      </Badge>
                    )}
                    {result.status === 'success' && (
                      <Badge variant="default">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Success ({result.duration}ms)
                      </Badge>
                    )}
                    {result.status === 'failed' && (
                      <Badge variant="destructive">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Failed
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Errors */}
      {Object.keys(errors).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Active Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(errors).map(([key, error]) => (
                <div key={key} className="p-2 bg-red-500/10 border border-red-500/20 rounded">
                  <div className="font-medium text-red-400">{key}</div>
                  <div className="text-sm text-red-300">{error}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};