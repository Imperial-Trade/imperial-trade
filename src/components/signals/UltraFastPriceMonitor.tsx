/**
 * ULTRA-FAST PRICE MONITOR
 * Real-time performance metrics for ultra-fast price pipeline
 */

import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useOptimizedWebSocketPrices } from '@/contexts/OptimizedWebSocketPriceContext';
import { usePriceStalenessMonitor } from '@/hooks/usePriceStalenessMonitor';
import { 
  Zap, 
  Activity, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  Wifi,
  RefreshCw,
  Target
} from 'lucide-react';

interface UltraFastPriceMonitorProps {
  symbols: string[];
  showMetrics?: boolean;
}

interface PerformanceMetrics {
  avgLatency: number;
  updateCount: number;
  missedUpdates: number;
  connectionStability: number;
  throughput: number; // Updates per second
}

export function UltraFastPriceMonitor({ 
  symbols = ['BTCUSD', 'XAUUSD'], 
  showMetrics = true 
}: UltraFastPriceMonitorProps) {
  const { prices, connectionStatus, subscribe, getPrice } = useOptimizedWebSocketPrices();
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    avgLatency: 0,
    updateCount: 0,
    missedUpdates: 0,
    connectionStability: 100,
    throughput: 0
  });
  
  const updateTimestamps = useRef<number[]>([]);
  const lastUpdateTime = useRef<number>(Date.now());
  
  // Subscribe to all symbols
  useEffect(() => {
    if (symbols.length > 0) {
      subscribe(symbols);
    }
  }, [symbols, subscribe]);
  
  // Track performance metrics
  useEffect(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateTime.current;
    
    // Track update timestamps for throughput calculation
    updateTimestamps.current.push(now);
    
    // Keep only last 60 seconds of timestamps
    const sixtySecondsAgo = now - 60000;
    updateTimestamps.current = updateTimestamps.current.filter(t => t > sixtySecondsAgo);
    
    // Calculate throughput (updates per second)
    const throughput = updateTimestamps.current.length / 60;
    
    // Update metrics
    setMetrics(prev => ({
      avgLatency: timeSinceLastUpdate < 1000 ? timeSinceLastUpdate : prev.avgLatency,
      updateCount: prev.updateCount + 1,
      missedUpdates: timeSinceLastUpdate > 2000 ? prev.missedUpdates + 1 : prev.missedUpdates,
      connectionStability: connectionStatus === 'connected' ? Math.min(100, prev.connectionStability + 0.1) : Math.max(0, prev.connectionStability - 1),
      throughput
    }));
    
    lastUpdateTime.current = now;
  }, [prices, connectionStatus]);
  
  // Get staleness status for all symbols
  const stalenessStatuses = symbols.map(symbol => ({
    symbol,
    ...usePriceStalenessMonitor(symbol, 15)
  }));
  
  const formatLatency = (ms: number) => {
    if (ms < 100) return `${ms.toFixed(0)}ms`;
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };
  
  const getLatencyColor = (ms: number) => {
    if (ms <= 100) return 'text-green-400';
    if (ms <= 500) return 'text-yellow-400';
    return 'text-red-400';
  };
  
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-500" />
          <h3 className="font-semibold">Ultra-Fast Price Pipeline</h3>
        </div>
        <Badge variant={connectionStatus === 'connected' ? 'default' : 'destructive'}>
          {connectionStatus}
        </Badge>
      </div>
      
      {/* Real-time Prices */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        {symbols.map(symbol => {
          const priceData = getPrice(symbol);
          const staleness = stalenessStatuses.find(s => s.symbol === symbol);
          
          return (
            <div key={symbol} className="p-3 border rounded-lg bg-background/50">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{symbol}</span>
                <Badge variant={staleness?.displayStatus === 'Live' ? 'default' : 'secondary'} className="text-xs">
                  {staleness?.displayStatus || 'Unknown'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold font-mono">
                  {priceData ? `$${priceData.price.toFixed(2)}` : '---'}
                </div>
                
                {priceData?.change !== undefined && (
                  <div className={`flex items-center gap-1 ${
                    priceData.change >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {priceData.change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    <span className="text-sm">
                      {priceData.change >= 0 ? '+' : ''}{priceData.change.toFixed(4)}
                    </span>
                  </div>
                )}
              </div>
              
              {staleness?.ageInSeconds !== null && (
                <div className="text-xs text-muted-foreground mt-1">
                  Age: {staleness.ageInSeconds}s
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Performance Metrics */}
      {showMetrics && (
        <div className="border-t pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Clock className="w-3 h-3" />
                <span className="text-xs text-muted-foreground">Latency</span>
              </div>
              <div className={`font-bold ${getLatencyColor(metrics.avgLatency)}`}>
                {formatLatency(metrics.avgLatency)}
              </div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Activity className="w-3 h-3" />
                <span className="text-xs text-muted-foreground">Throughput</span>
              </div>
              <div className="font-bold">
                {metrics.throughput.toFixed(1)}/s
              </div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Target className="w-3 h-3" />
                <span className="text-xs text-muted-foreground">Updates</span>
              </div>
              <div className="font-bold text-green-400">
                {metrics.updateCount}
              </div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Wifi className="w-3 h-3" />
                <span className="text-xs text-muted-foreground">Stability</span>
              </div>
              <div className="font-bold">
                {metrics.connectionStability.toFixed(0)}%
              </div>
            </div>
          </div>
          
          {metrics.missedUpdates > 0 && (
            <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
              ⚠️ {metrics.missedUpdates} missed updates detected
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default UltraFastPriceMonitor;
