import { useMemo } from 'react';

export type ConnectionQuality = 'excellent' | 'good' | 'poor' | 'offline';

interface ConnectionQualityMetrics {
  quality: ConnectionQuality;
  latency: number;
  dataFreshness: number;
  isEffectivelyConnected: boolean;
  recommendedUpdateFrequency: number;
  shouldReduceAnimations: boolean;
  shouldUseLightweightUI: boolean;
}

export function useConnectionQualityAdapter(
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error',
  lastUpdated: Date | null,
  averageLatency?: number
): ConnectionQualityMetrics {
  return useMemo(() => {
    // Calculate data freshness
    const dataFreshness = lastUpdated 
      ? Math.floor((Date.now() - lastUpdated.getTime()) / 1000)
      : Infinity;

    // Determine connection quality
    let quality: ConnectionQuality = 'offline';
    
    if (connectionStatus === 'connected' && dataFreshness < 5) {
      if (averageLatency && averageLatency < 100) {
        quality = 'excellent';
      } else if (averageLatency && averageLatency < 300) {
        quality = 'good';
      } else {
        quality = 'poor';
      }
    } else if (connectionStatus === 'connected' && dataFreshness < 30) {
      quality = 'poor';
    } else {
      quality = 'offline';
    }

    // Determine if effectively connected
    const isEffectivelyConnected = 
      connectionStatus === 'connected' && dataFreshness < 30;

    // Recommended update frequency based on quality
    const recommendedUpdateFrequency = {
      excellent: 1000,  // 1s
      good: 2000,       // 2s
      poor: 5000,       // 5s
      offline: 0        // No updates
    }[quality];

    // UI optimization recommendations
    const shouldReduceAnimations = quality === 'poor' || quality === 'offline';
    const shouldUseLightweightUI = quality === 'poor' || quality === 'offline';

    return {
      quality,
      latency: averageLatency || 0,
      dataFreshness,
      isEffectivelyConnected,
      recommendedUpdateFrequency,
      shouldReduceAnimations,
      shouldUseLightweightUI
    };
  }, [connectionStatus, lastUpdated, averageLatency]);
}
