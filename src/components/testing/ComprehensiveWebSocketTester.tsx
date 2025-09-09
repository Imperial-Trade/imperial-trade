import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOptimizedWebSocketPrices } from '@/contexts/OptimizedWebSocketPriceContext';
import { useIngestSecret } from '@/hooks/useIngestSecret';
import { supabase } from '@/integrations/supabase/client';
import { Activity, Wifi, WifiOff, Zap, BarChart3, AlertTriangle } from 'lucide-react';
import { isDevToolsEnabled } from '@/utils/featureFlags';

interface TestMetrics {
  pricesReceived: number;
  uniqueSymbols: number;
  avgLatency: number;
  connectionUptime: number;
  lastUpdate: number;
  errorCount: number;
  testStartTime: number;
}

interface PriceUpdate {
  symbol: string;
  price: number;
  timestamp: number;
  latency?: number;
}

export const ComprehensiveWebSocketTester: React.FC = () => {
  const { prices, connectionStatus, subscribe, unsubscribe, dataSource } = useOptimizedWebSocketPrices();
  const { isConfigured: hasSecret, isLoading: secretLoading } = useIngestSecret();
  
  const [isAutoTesting, setIsAutoTesting] = useState(false);
  const [testMetrics, setTestMetrics] = useState<TestMetrics>({
    pricesReceived: 0,
    uniqueSymbols: 0,
    avgLatency: 0,
    connectionUptime: 0,
    lastUpdate: 0,
    errorCount: 0,
    testStartTime: Date.now()
  });
  const [recentPrices, setRecentPrices] = useState<PriceUpdate[]>([]);
  const [isGeneratingPrices, setIsGeneratingPrices] = useState(false);
  const [lastSentBatch, setLastSentBatch] = useState<string>('');
  
  const intervalRef = useRef<NodeJS.Timeout>();
  const testSymbols = ['XAUUSD', 'BTCUSD']; // Restricted to essential symbols only
  const latencyBuffer = useRef<number[]>([]);

  // Generate mock prices and send to price-ingestor
  const sendTestPrices = useCallback(async () => {
    if (!hasSecret) return;

    const timestamp = Date.now();
    const mockPrices: Record<string, number> = {};
    
    testSymbols.forEach(symbol => {
      const basePrice = symbol === 'XAUUSD' ? 2025.00 : 43500.00; // Only XAUUSD and BTCUSD
      
      const variation = (Math.random() - 0.5) * 0.002;
      mockPrices[symbol] = Number((basePrice * (1 + variation)).toFixed(5));
    });

    try {
      const response = await supabase.functions.invoke('price-ingestor', {
        body: {
          timestamp,
          prices: mockPrices,
          source: 'comprehensive-tester',
          batch_id: `test_${timestamp}`
        }
      });

      if (response.error) {
        setTestMetrics(prev => ({ ...prev, errorCount: prev.errorCount + 1 }));
        setLastSentBatch(`❌ Error: ${response.error.message}`);
      } else {
        const data = response.data;
        setLastSentBatch(`✅ Sent ${data?.processed || 0} prices, ${data?.broadcasted || 0} broadcasted (${data?.efficiency || 'N/A'})`);
      }
    } catch (error) {
      setTestMetrics(prev => ({ ...prev, errorCount: prev.errorCount + 1 }));
      setLastSentBatch(`❌ Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [hasSecret]);

  // Start/stop price generation
  const togglePriceGeneration = useCallback(() => {
    if (isGeneratingPrices) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = undefined;
      }
      setIsGeneratingPrices(false);
    } else {
      intervalRef.current = setInterval(sendTestPrices, 3000);
      setIsGeneratingPrices(true);
      sendTestPrices(); // Send immediately
    }
  }, [isGeneratingPrices, sendTestPrices]);

  // Subscribe to test symbols
  useEffect(() => {
    if (isAutoTesting) {
      console.log('🔌 Subscribing to test symbols:', testSymbols);
      subscribe(testSymbols);
      
      return () => {
        if (isDevToolsEnabled()) {
          console.log('🔌 Unsubscribing from test symbols');
        }
        unsubscribe(testSymbols);
      };
    }
  }, [isAutoTesting, subscribe, unsubscribe]);

  // Monitor price updates and calculate metrics
  useEffect(() => {
    const now = Date.now();
    const newPriceUpdates: PriceUpdate[] = [];
    
    Object.entries(prices).forEach(([symbol, priceData]) => {
      if (testSymbols.includes(symbol) && priceData) {
        const latency = now - new Date(priceData.timestamp).getTime();
        latencyBuffer.current.push(latency);
        
        // Keep only last 50 latency measurements
        if (latencyBuffer.current.length > 50) {
          latencyBuffer.current.shift();
        }
        
        newPriceUpdates.push({
          symbol,
          price: priceData.price,
          timestamp: new Date(priceData.timestamp).getTime(),
          latency
        });
      }
    });

    if (newPriceUpdates.length > 0) {
      setRecentPrices(prev => {
        const combined = [...newPriceUpdates, ...prev];
        return combined.slice(0, 20); // Keep last 20 updates
      });

      setTestMetrics(prev => ({
        ...prev,
        pricesReceived: prev.pricesReceived + newPriceUpdates.length,
        uniqueSymbols: new Set([...Object.keys(prices), ...testSymbols]).size,
        avgLatency: latencyBuffer.current.length > 0 
          ? latencyBuffer.current.reduce((a, b) => a + b, 0) / latencyBuffer.current.length 
          : 0,
        lastUpdate: now,
        connectionUptime: now - prev.testStartTime
      }));
    }
  }, [prices]);

  // Reset metrics
  const resetMetrics = useCallback(() => {
    setTestMetrics({
      pricesReceived: 0,
      uniqueSymbols: 0,
      avgLatency: 0,
      connectionUptime: 0,
      lastUpdate: 0,
      errorCount: 0,
      testStartTime: Date.now()
    });
    setRecentPrices([]);
    setLastSentBatch('');
    latencyBuffer.current = [];
  }, []);

  const getConnectionColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-success text-success-foreground';
      case 'connecting': return 'bg-warning text-warning-foreground';
      case 'disconnected': return 'bg-muted text-muted-foreground';
      case 'error': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getConnectionIcon = (status: string) => {
    switch (status) {
      case 'connected': return <Wifi className="h-4 w-4" />;
      case 'connecting': return <Activity className="h-4 w-4 animate-pulse" />;
      default: return <WifiOff className="h-4 w-4" />;
    }
  };

  if (secretLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <Activity className="h-4 w-4 animate-spin" />
            <span>Loading WebSocket tester...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Comprehensive WebSocket Tester
          </CardTitle>
          <CardDescription>
            End-to-end testing for price-ingestor → WebSocket → client display pipeline
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                {getConnectionIcon(connectionStatus)}
                <span className="font-medium">Connection</span>
              </div>
              <Badge className={getConnectionColor(connectionStatus)}>
                {connectionStatus}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                <span className="font-medium">Data Source</span>
              </div>
              <Badge variant="outline">{dataSource}</Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Ingest Secret</span>
              </div>
              <Badge variant={hasSecret ? 'default' : 'destructive'}>
                {hasSecret ? 'Configured' : 'Missing'}
              </Badge>
            </div>
          </div>

          <Tabs defaultValue="testing" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="testing">Live Testing</TabsTrigger>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
              <TabsTrigger value="prices">Price Feed</TabsTrigger>
            </TabsList>

            <TabsContent value="testing" className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="auto-test"
                    checked={isAutoTesting}
                    onCheckedChange={setIsAutoTesting}
                    disabled={!hasSecret}
                  />
                  <label htmlFor="auto-test" className="text-sm font-medium">
                    Auto-subscribe to test symbols
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="price-gen"
                    checked={isGeneratingPrices}
                    onCheckedChange={togglePriceGeneration}
                    disabled={!hasSecret}
                  />
                  <label htmlFor="price-gen" className="text-sm font-medium">
                    Generate test prices
                  </label>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={sendTestPrices} disabled={!hasSecret} variant="outline">
                  Send Single Batch
                </Button>
                <Button onClick={resetMetrics} variant="outline">
                  Reset Metrics
                </Button>
              </div>

              {lastSentBatch && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-mono">{lastSentBatch}</p>
                </div>
              )}

              {!hasSecret && (
                <div className="p-4 bg-warning/10 border border-warning rounded-lg">
                  <p className="text-sm text-warning-foreground">
                    ⚠️ INGEST_SECRET not configured. Cannot send test prices to price-ingestor.
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="metrics" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-primary">{testMetrics.pricesReceived}</div>
                    <div className="text-sm text-muted-foreground">Prices Received</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-primary">{testMetrics.uniqueSymbols}</div>
                    <div className="text-sm text-muted-foreground">Unique Symbols</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-primary">{Math.round(testMetrics.avgLatency)}ms</div>
                    <div className="text-sm text-muted-foreground">Avg Latency</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-destructive">{testMetrics.errorCount}</div>
                    <div className="text-sm text-muted-foreground">Errors</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Connection Uptime</span>
                    <span className="text-sm text-muted-foreground">
                      {Math.floor(testMetrics.connectionUptime / 60000)}m {Math.floor((testMetrics.connectionUptime % 60000) / 1000)}s
                    </span>
                  </div>
                  <Progress value={connectionStatus === 'connected' ? 100 : 0} className="h-2" />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="prices" className="space-y-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Recent Price Updates</h4>
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {recentPrices.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No price updates received yet. Enable auto-testing and price generation to see live data.
                    </p>
                  ) : (
                    recentPrices.map((update, index) => (
                      <div key={`${update.symbol}-${update.timestamp}-${index}`} 
                           className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">{update.symbol}</Badge>
                          <span className="font-mono text-sm">{update.price}</span>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <div>{new Date(update.timestamp).toLocaleTimeString()}</div>
                          {update.latency && <div>{Math.round(update.latency)}ms</div>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
