import { useState, useEffect, useMemo } from 'react';

interface ConnectionQuality {
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'offline';
  effectivelyConnected: boolean;
  dataFreshness: number; // seconds since last update
  averageLatency: number; // milliseconds
  qualityScore: number; // 0-100
  description: string;
  recommendation: string;
}

/**
 * Connection Quality Hook - Hybrid status based on data freshness and latency
 * Provides intelligent connection status beyond simple socket state
 */
export function useConnectionQuality(
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error',
  lastUpdated: Date | null,
  priceSource?: string
): ConnectionQuality {
  const [latencyHistory, setLatencyHistory] = useState<number[]>([]);

  // Track connection quality over time
  useEffect(() => {
    const interval = setInterval(() => {
      if (connectionStatus === 'connected' && lastUpdated) {
        const latency = Date.now() - lastUpdated.getTime();
        setLatencyHistory(prev => [...prev.slice(-9), latency]); // Keep last 10 measurements
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [connectionStatus, lastUpdated]);

  const quality = useMemo((): ConnectionQuality => {
    const dataFreshness = lastUpdated ? (Date.now() - lastUpdated.getTime()) / 1000 : Infinity;
    const averageLatency = latencyHistory.length > 0 
      ? latencyHistory.reduce((a, b) => a + b, 0) / latencyHistory.length 
      : 0;

    // Determine if effectively connected based on data freshness
    const effectivelyConnected = dataFreshness < 60 && connectionStatus !== 'error';

    let status: ConnectionQuality['status'];
    let qualityScore: number;
    let description: string;
    let recommendation: string;

    if (connectionStatus === 'error' || dataFreshness > 300) {
      status = 'offline';
      qualityScore = 0;
      description = 'No connection to price feeds';
      recommendation = 'Check internet connection';
    } else if (dataFreshness > 60) {
      status = 'poor';
      qualityScore = 25;
      description = 'Stale price data';
      recommendation = 'Refresh page or wait for reconnection';
    } else if (dataFreshness > 30 || averageLatency > 5000) {
      status = 'fair';
      qualityScore = 50;
      description = 'Some lag in price updates';
      recommendation = 'Connection may be unstable';
    } else if (dataFreshness > 10 || averageLatency > 2000) {
      status = 'good';
      qualityScore = 75;
      description = 'Good connection quality';
      recommendation = 'Normal operation';
    } else {
      status = 'excellent';
      qualityScore = 100;
      description = priceSource === 'websocket' ? 'Real-time updates active' : 'Fast price updates';
      recommendation = 'Optimal performance';
    }

    return {
      status,
      effectivelyConnected,
      dataFreshness,
      averageLatency,
      qualityScore,
      description,
      recommendation
    };
  }, [connectionStatus, lastUpdated, latencyHistory, priceSource]);

  return quality;
}