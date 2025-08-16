import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  Zap, 
  TrendingUp, 
  AlertTriangle, 
  Settings, 
  BarChart3,
  Clock,
  Bell,
  Target,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useEnhancedNotifications } from '@/hooks/useEnhancedNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: number;
  bid: number;
  ask: number;
  spread: number;
}

interface TradingSignal {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  strength: number;
  confidence: number;
  source: string;
  timestamp: number;
  price: number;
  target?: number;
  stopLoss?: number;
}

interface AlertTrigger {
  id: string;
  type: 'price_alert' | 'volume_spike' | 'volatility_break' | 'signal_match';
  symbol: string;
  condition: string;
  triggered: boolean;
  triggeredAt?: number;
  value: number;
  threshold: number;
}

export default function Phase3RealTimeEngine() {
  const { user } = useAuth();
  const { 
    preferences, 
    stats,
    testNotification
  } = useEnhancedNotifications();
  
  const [isConnected, setIsConnected] = useState(true);
  const [connectionQuality, setConnectionQuality] = useState(95);

  const [isEngineActive, setIsEngineActive] = useState(false);
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [tradingSignals, setTradingSignals] = useState<TradingSignal[]>([]);
  const [alertTriggers, setAlertTriggers] = useState<AlertTrigger[]>([]);
  const [realtimeMetrics, setRealtimeMetrics] = useState({
    latency: 0,
    throughput: 0,
    missedUpdates: 0,
    connectionUptime: 100
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const latencyTestRef = useRef<number>(0);

  // Initialize real-time WebSocket connection
  useEffect(() => {
    if (!isEngineActive || !user) return;

    const connectWebSocket = () => {
      try {
        // Connect to Tradermade WebSocket via our edge function
        wsRef.current = new WebSocket(`wss://kmuoqkcxguafxulqlbmi.functions.supabase.co/functions/v1/tradermade-streaming`);
        
        wsRef.current.onopen = () => {
          console.log('[Phase3] WebSocket connected');
          setRealtimeMetrics(prev => ({ ...prev, connectionUptime: 100 }));
        };

        wsRef.current.onmessage = (event) => {
          const data = JSON.parse(event.data);
          handleRealtimeUpdate(data);
        };

        wsRef.current.onerror = (error) => {
          console.error('[Phase3] WebSocket error:', error);
          setRealtimeMetrics(prev => ({ ...prev, missedUpdates: prev.missedUpdates + 1 }));
        };

        wsRef.current.onclose = () => {
          console.log('[Phase3] WebSocket disconnected');
          if (isEngineActive) {
            reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
          }
        };

      } catch (error) {
        console.error('[Phase3] Failed to connect WebSocket:', error);
      }
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [isEngineActive, user]);

  // Real-time data processing
  const handleRealtimeUpdate = (data: any) => {
    const now = performance.now();
    const latency = now - latencyTestRef.current;
    latencyTestRef.current = now;

    setRealtimeMetrics(prev => ({
      ...prev,
      latency: Math.round(latency),
      throughput: prev.throughput + 1
    }));

    if (data.type === 'market_data') {
      updateMarketData(data.payload);
    } else if (data.type === 'trading_signal') {
      processSignal(data.payload);
    } else if (data.type === 'alert_trigger') {
      triggerAlert(data.payload);
    }
  };

  const updateMarketData = (data: any) => {
    const marketUpdate: MarketData = {
      symbol: data.symbol,
      price: data.mid || data.price,
      change: data.change || 0,
      changePercent: data.changePercent || 0,
      volume: data.volume || 0,
      timestamp: Date.now(),
      bid: data.bid || data.price,
      ask: data.ask || data.price,
      spread: data.ask - data.bid || 0
    };

    setMarketData(prev => {
      const existing = prev.findIndex(item => item.symbol === marketUpdate.symbol);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = marketUpdate;
        return updated;
      }
      return [...prev, marketUpdate].slice(-20); // Keep last 20 symbols
    });
  };

  const processSignal = (signal: TradingSignal) => {
    setTradingSignals(prev => [signal, ...prev].slice(0, 10));
    
    // Send real-time notification for high-confidence signals
    if (signal.confidence > 0.8) {
      testNotification('signal_created');
    }
  };

  const triggerAlert = (alert: AlertTrigger) => {
    setAlertTriggers(prev => [{ ...alert, triggered: true, triggeredAt: Date.now() }, ...prev].slice(0, 15));
    
    // Send alert notification
    testNotification('price_alert');
  };

  // Mock signal generation for demo
  const generateMockSignal = () => {
    const symbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'BTCUSD', 'XAUUSD'];
    const signal: TradingSignal = {
      id: `signal_${Date.now()}`,
      symbol: symbols[Math.floor(Math.random() * symbols.length)],
      type: Math.random() > 0.5 ? 'buy' : 'sell',
      strength: Math.round(Math.random() * 100),
      confidence: Number((Math.random() * 0.6 + 0.4).toFixed(2)),
      source: 'AI_ENGINE',
      timestamp: Date.now(),
      price: Number((Math.random() * 100 + 1000).toFixed(4)),
      target: Number((Math.random() * 50 + 1050).toFixed(4)),
      stopLoss: Number((Math.random() * 50 + 950).toFixed(4))
    };
    
    processSignal(signal);
  };

  const toggleEngine = async () => {
    setIsEngineActive(!isEngineActive);
    
    if (!isEngineActive) {
      // Start metrics reset
      setRealtimeMetrics({
        latency: 0,
        throughput: 0,
        missedUpdates: 0,
        connectionUptime: 100
      });
      
      // Initialize with some mock data
      setTimeout(() => generateMockSignal(), 2000);
      
      testNotification('system');
    } else {
      testNotification('system');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(price);
  };

  const getSignalStrengthColor = (strength: number) => {
    if (strength >= 80) return 'text-green-600';
    if (strength >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Engine Control Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Activity className="w-6 h-6 text-blue-500" />
                {isEngineActive && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                )}
              </div>
              Phase 3: Real-Time Trading Engine
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <Wifi className="w-4 h-4 text-green-500" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-500" />
                )}
                <span className="text-sm text-muted-foreground">
                  {connectionQuality}% quality
                </span>
              </div>
              <Button
                onClick={toggleEngine}
                variant={isEngineActive ? "destructive" : "default"}
                className="gap-2"
              >
                <Zap className="w-4 h-4" />
                {isEngineActive ? 'Stop Engine' : 'Start Engine'}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-lg font-bold text-blue-600">{realtimeMetrics.latency}ms</div>
              <div className="text-xs text-blue-600">Latency</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-lg font-bold text-green-600">{realtimeMetrics.throughput}</div>
              <div className="text-xs text-green-600">Updates/min</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-lg font-bold text-yellow-600">{realtimeMetrics.missedUpdates}</div>
              <div className="text-xs text-yellow-600">Missed Updates</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-lg font-bold text-purple-600">{realtimeMetrics.connectionUptime}%</div>
              <div className="text-xs text-purple-600">Uptime</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Real-Time Data Tabs */}
      <Tabs defaultValue="market" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="market" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Market Data
          </TabsTrigger>
          <TabsTrigger value="signals" className="gap-2">
            <Target className="w-4 h-4" />
            Trading Signals
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-2">
            <Bell className="w-4 h-4" />
            Alert Triggers
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="w-4 h-4" />
            Engine Config
          </TabsTrigger>
        </TabsList>

        <TabsContent value="market" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Live Market Data Stream
              </CardTitle>
            </CardHeader>
            <CardContent>
              {marketData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {isEngineActive ? 'Waiting for market data...' : 'Start engine to view live market data'}
                </div>
              ) : (
                <div className="space-y-3">
                  {marketData.map((data, index) => (
                    <div key={data.symbol} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{data.symbol}</Badge>
                        <div className="text-lg font-mono">{formatPrice(data.price)}</div>
                        <div className={`text-sm ${data.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {data.change >= 0 ? '+' : ''}{data.changePercent.toFixed(2)}%
                        </div>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <div>Spread: {data.spread.toFixed(4)}</div>
                        <div>{new Date(data.timestamp).toLocaleTimeString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="signals" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                AI Trading Signals
              </CardTitle>
              <Button onClick={generateMockSignal} size="sm" disabled={!isEngineActive}>
                Generate Test Signal
              </Button>
            </CardHeader>
            <CardContent>
              {tradingSignals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No signals generated yet
                </div>
              ) : (
                <div className="space-y-3">
                  {tradingSignals.map((signal) => (
                    <div key={signal.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <Badge variant={signal.type === 'buy' ? 'default' : 'destructive'}>
                            {signal.type.toUpperCase()}
                          </Badge>
                          <span className="font-mono font-bold">{signal.symbol}</span>
                          <span className="text-sm text-muted-foreground">@{formatPrice(signal.price)}</span>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-bold ${getSignalStrengthColor(signal.strength)}`}>
                            {signal.confidence * 100}% confidence
                          </div>
                          <div className="text-xs text-muted-foreground">{signal.source}</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-xs">
                        <div>Entry: {formatPrice(signal.price)}</div>
                        {signal.target && <div>Target: {formatPrice(signal.target)}</div>}
                        {signal.stopLoss && <div>Stop: {formatPrice(signal.stopLoss)}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Alert Triggers & Conditions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {alertTriggers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No alerts triggered yet
                </div>
              ) : (
                <div className="space-y-3">
                  {alertTriggers.map((alert) => (
                    <div key={alert.id} className="p-3 border rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${alert.triggered ? 'bg-red-500' : 'bg-gray-300'}`} />
                        <Badge variant="outline">{alert.symbol}</Badge>
                        <span className="text-sm">{alert.condition}</span>
                      </div>
                      <div className="text-right text-xs">
                        <div>Value: {alert.value}</div>
                        {alert.triggeredAt && (
                          <div className="text-muted-foreground">
                            {new Date(alert.triggeredAt).toLocaleTimeString()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Engine Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-2">Notification Settings</h4>
                  <div className="space-y-2 text-sm">
                    <div>Signal Alerts: {preferences?.trading?.signal_created?.enabled ? 'Enabled' : 'Disabled'}</div>
                    <div>Price Alerts: {preferences?.alerts?.critical?.push ? 'Enabled' : 'Disabled'}</div>
                    <div>Audio Notifications: {preferences?.channels?.push?.enabled ? 'Enabled' : 'Disabled'}</div>
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-2">Performance Stats</h4>
                  <div className="space-y-2 text-sm">
                    <div>Total Sent: {stats?.total_sent || 0}</div>
                    <div>Total Delivered: {stats?.total_delivered || 0}</div>
                    <div>Engagement Score: {stats?.engagement_score || 0}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Engine Status Footer */}
      {isEngineActive && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Real-time engine active
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Session: {Math.floor((Date.now() % 3600000) / 60000)}min
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}