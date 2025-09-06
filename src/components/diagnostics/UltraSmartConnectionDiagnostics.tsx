/**
 * ULTRA-SMART CONNECTION DIAGNOSTICS
 * Real-time monitoring and debugging for WebSocket connections
 */

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useHybridWebSocketPrices } from '@/contexts/HybridWebSocketPriceContext';
import { getSymbolStreamingPolicy, canStreamAnySymbol, getUnifiedMarketStatus } from '@/utils/unifiedMarketHours';
import { Activity, Wifi, WifiOff, Clock, AlertTriangle, CheckCircle, Zap } from 'lucide-react';

interface ConnectionMetrics {
  messagesReceived: number;
  reconnections: number;
  avgLatency: number;
  uptime: number;
}

export function UltraSmartConnectionDiagnostics() {
  const { connectionStatus, prices, lastUpdated, subscribe, getStats, isUsingEnhancedSystem } = useHybridWebSocketPrices();
  const [testSymbols] = useState(['XAUUSD', 'BTCUSD', 'EURUSD']);
  const [metrics, setMetrics] = useState<ConnectionMetrics>({
    messagesReceived: 0,
    reconnections: 0,
    avgLatency: 0,
    uptime: 0
  });
  const [isMonitoring, setIsMonitoring] = useState(false);

  useEffect(() => {
    if (getStats) {
      const stats = getStats();
      setMetrics(prev => ({
        ...prev,
        messagesReceived: stats.messagesReceived,
        reconnections: stats.reconnections,
        avgLatency: stats.avgLatency
      }));
    }
  }, [getStats, prices]);

  const getConnectionStatusInfo = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          icon: Wifi,
          label: 'Connected',
          color: 'bg-green-500/10 text-green-500',
          description: 'Ultra-fast real-time connection active'
        };
      case 'connecting':
        return {
          icon: Activity,
          label: 'Connecting',
          color: 'bg-yellow-500/10 text-yellow-500',
          description: 'Establishing WebSocket connection...'
        };
      case 'disconnected':
        return {
          icon: WifiOff,
          label: 'Disconnected',
          color: 'bg-gray-500/10 text-gray-500',
          description: 'Connection not established'
        };
      case 'error':
        return {
          icon: AlertTriangle,
          label: 'Error',
          color: 'bg-red-500/10 text-red-500',
          description: 'Connection error detected'
        };
      default:
        return {
          icon: WifiOff,
          label: 'Unknown',
          color: 'bg-gray-500/10 text-gray-500',
          description: 'Unknown connection state'
        };
    }
  };

  const runDiagnosticTest = async () => {
    setIsMonitoring(true);
    
    console.log('🔧 ULTRA-SMART: Running comprehensive connection diagnostics...');
    
    // Test each symbol's streaming policy
    for (const symbol of testSymbols) {
      const policy = getSymbolStreamingPolicy(symbol);
      const status = getUnifiedMarketStatus(symbol);
      
      console.log(`🎯 ${symbol}:`, {
        canStream: policy.allowStreaming,
        reason: policy.reason,
        marketType: status.marketType,
        session: status.session
      });
    }

    // Test multi-symbol streaming
    const multiCheck = canStreamAnySymbol(testSymbols);
    console.log('🚀 Multi-symbol check:', multiCheck);

    // Subscribe to test symbols for connection verification
    if (multiCheck.canStream) {
      console.log('📡 Testing subscription with allowed symbols...');
      subscribe(multiCheck.allowedSymbols);
    }

    setTimeout(() => setIsMonitoring(false), 3000);
  };

  const statusInfo = getConnectionStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Ultra-Smart Connection Diagnostics
            </CardTitle>
            <CardDescription>
              Real-time WebSocket monitoring with intelligent market detection
            </CardDescription>
          </div>
          <Button onClick={runDiagnosticTest} disabled={isMonitoring} size="sm">
            {isMonitoring ? 'Testing...' : 'Run Test'}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${statusInfo.color}`}>
              <StatusIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="font-medium">{statusInfo.label}</div>
              <div className="text-sm text-muted-foreground">{statusInfo.description}</div>
            </div>
          </div>
          <Badge variant={connectionStatus === 'connected' ? 'default' : 'secondary'}>
            {isUsingEnhancedSystem ? 'Enhanced' : 'Legacy'} System
          </Badge>
        </div>

        {/* Symbol Streaming Status */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Symbol Streaming Status
          </h4>
          <div className="grid grid-cols-1 gap-2">
            {testSymbols.map(symbol => {
              const policy = getSymbolStreamingPolicy(symbol);
              const status = getUnifiedMarketStatus(symbol);
              const hasPrice = !!prices[symbol];
              
              return (
                <div key={symbol} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${policy.allowStreaming ? 'bg-green-500' : 'bg-red-500'}`} />
                    <div>
                      <div className="font-medium">{symbol}</div>
                      <div className="text-xs text-muted-foreground">{status.marketType} • {status.session}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={hasPrice ? 'default' : 'outline'} className="text-xs">
                      {hasPrice ? '📊 Live' : '⏸️ No Data'}
                    </Badge>
                    <div className="text-xs text-muted-foreground mt-1">
                      {policy.allowStreaming ? 'Streaming' : 'Blocked'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-sm font-medium">Messages Received</div>
            <div className="text-2xl font-bold text-primary">{metrics.messagesReceived}</div>
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium">Avg Latency</div>
            <div className="text-2xl font-bold text-primary">{metrics.avgLatency}ms</div>
          </div>
        </div>

        {/* Last Updated */}
        {lastUpdated && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            Last update: {lastUpdated.toLocaleTimeString()}
          </div>
        )}

        {/* Active Prices Count */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Active price feeds:</span>
          <Badge variant="outline">{Object.keys(prices).length}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}