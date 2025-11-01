import { useState, useEffect, useRef } from 'react';
import { useOptimizedWebSocketPrices } from '@/contexts/OptimizedWebSocketPriceContext';

interface ConnectionHealthMetrics {
  tickFrequency: number; // in ms
  actualFrequency: number; // measured actual frequency
  connectionUptime: number; // in percentage
  missedTicks: number;
  isHealthy: boolean;
  lastTickTime: number | null;
  averageLatency: number;
}

export function useConnectionHealth() {
  const { connectionStatus, lastUpdated, prices } = useOptimizedWebSocketPrices();
  const [metrics, setMetrics] = useState<ConnectionHealthMetrics>({
    tickFrequency: 250,
    actualFrequency: 0,
    connectionUptime: 0,
    missedTicks: 0,
    isHealthy: false,
    lastTickTime: null,
    averageLatency: 0
  });

  const tickTimesRef = useRef<number[]>([]);
  const startTimeRef = useRef<number>(Date.now());
  const lastUpdateRef = useRef<Date | null>(null);
  const missedTicksRef = useRef<number>(0);

  useEffect(() => {
    if (lastUpdated && lastUpdated !== lastUpdateRef.current) {
      const now = Date.now();
      const tickTime = lastUpdated.getTime();
      
      // Track tick times for frequency calculation
      tickTimesRef.current.push(tickTime);
      
      // Keep only the last 20 ticks for rolling average
      if (tickTimesRef.current.length > 20) {
        tickTimesRef.current.shift();
      }
      
      // Calculate actual frequency
      let actualFrequency = 0;
      if (tickTimesRef.current.length >= 2) {
        const intervals = [];
        for (let i = 1; i < tickTimesRef.current.length; i++) {
          intervals.push(tickTimesRef.current[i] - tickTimesRef.current[i - 1]);
        }
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        actualFrequency = avgInterval;
      }
      
      // Check for missed ticks (if interval is significantly larger than 250ms)
      if (lastUpdateRef.current) {
        const timeSinceLastUpdate = tickTime - lastUpdateRef.current.getTime();
        if (timeSinceLastUpdate > 500) { // More than 2x expected frequency
          const missedTickCount = Math.floor(timeSinceLastUpdate / 250) - 1;
          missedTicksRef.current += Math.max(0, missedTickCount);
        }
      }
      
      // Calculate uptime percentage
      const totalTime = now - startTimeRef.current;
      const expectedTicks = Math.floor(totalTime / 250);
      const actualTicks = tickTimesRef.current.length;
      const uptimePercentage = expectedTicks > 0 ? (actualTicks / expectedTicks) * 100 : 0;
      
      // Calculate average latency (simplified estimation)
      const averageLatency = actualFrequency > 0 ? Math.abs(actualFrequency - 250) : 0;
      
      setMetrics({
        tickFrequency: 250,
        actualFrequency: Math.round(actualFrequency),
        connectionUptime: Math.min(100, Math.round(uptimePercentage)),
        missedTicks: missedTicksRef.current,
        isHealthy: connectionStatus === 'connected' && actualFrequency > 0 && actualFrequency < 400,
        lastTickTime: tickTime,
        averageLatency: Math.round(averageLatency)
      });
      
      lastUpdateRef.current = lastUpdated;
    }
  }, [lastUpdated, connectionStatus]);

  // Reset metrics when connection changes
  useEffect(() => {
    if (connectionStatus === 'connecting' || connectionStatus === 'disconnected') {
      tickTimesRef.current = [];
      startTimeRef.current = Date.now();
      missedTicksRef.current = 0;
      lastUpdateRef.current = null;
    }
  }, [connectionStatus]);

  return metrics;
}
