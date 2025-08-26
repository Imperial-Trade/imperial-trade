
import { useState, useEffect, useCallback, useRef } from 'react';

export interface WebSocketHealth {
  isConnected: boolean;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  lastPingTime: number | null;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected';
  isHealthy: boolean;
  actualFrequency: number;
  connectionUptime: number;
  missedPings: number;
  averageLatency: number;
}

export interface UseWebSocketHealthReturn extends WebSocketHealth {
  startHealthCheck: (ws: WebSocket) => void;
  stopHealthCheck: () => void;
  forceReconnect: () => void;
}

export const useWebSocketHealth = (
  maxReconnectAttempts: number = 5
): UseWebSocketHealthReturn => {
  const [health, setHealth] = useState<WebSocketHealth>({
    isConnected: false,
    reconnectAttempts: 0,
    maxReconnectAttempts,
    lastPingTime: null,
    connectionQuality: 'disconnected',
    isHealthy: false,
    actualFrequency: 0,
    connectionUptime: 0,
    missedPings: 0,
    averageLatency: 0
  });

  const pingIntervalRef = useRef<NodeJS.Timeout>();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const wsRef = useRef<WebSocket>();
  const pingTimesRef = useRef<number[]>([]);
  const connectionStartRef = useRef<number>();
  const totalDowntimeRef = useRef<number>(0);
  const lastDisconnectRef = useRef<number>();

  const updateConnectionQuality = useCallback((pingTime: number | null) => {
    if (!pingTime) {
      return 'disconnected';
    } else if (pingTime < 100) {
      return 'excellent';
    } else if (pingTime < 300) {
      return 'good';
    } else {
      return 'poor';
    }
  }, []);

  const calculateMetrics = useCallback(() => {
    const now = Date.now();
    const connectionStart = connectionStartRef.current || now;
    const totalTime = now - connectionStart;
    const uptime = totalTime > 0 ? Math.max(0, 100 - (totalDowntimeRef.current / totalTime) * 100) : 0;
    
    // Calculate average latency from recent pings
    const recentPings = pingTimesRef.current.slice(-10);
    const avgLatency = recentPings.length > 0 
      ? recentPings.reduce((sum, time) => sum + time, 0) / recentPings.length 
      : 0;

    return {
      connectionUptime: Math.round(uptime),
      averageLatency: Math.round(avgLatency),
      actualFrequency: recentPings.length > 1 ? 30000 : 0 // 30 second ping interval
    };
  }, []);

  const ping = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setHealth(prev => {
        const metrics = calculateMetrics();
        return {
          ...prev,
          isConnected: false,
          connectionQuality: 'disconnected',
          isHealthy: false,
          missedPings: prev.missedPings + 1,
          ...metrics
        };
      });
      return;
    }

    const startTime = performance.now();
    
    try {
      wsRef.current.send(JSON.stringify({ type: 'ping', timestamp: startTime }));
      
      const pingTime = performance.now() - startTime;
      pingTimesRef.current.push(pingTime);
      
      // Keep only last 20 ping times
      if (pingTimesRef.current.length > 20) {
        pingTimesRef.current = pingTimesRef.current.slice(-20);
      }

      const metrics = calculateMetrics();
      const quality = updateConnectionQuality(pingTime);
      
      setHealth(prev => ({
        ...prev,
        isConnected: true,
        lastPingTime: pingTime,
        connectionQuality: quality,
        isHealthy: quality !== 'disconnected' && quality !== 'poor',
        reconnectAttempts: 0,
        ...metrics
      }));
    } catch (error) {
      console.warn('WebSocket ping failed:', error);
      setHealth(prev => {
        const metrics = calculateMetrics();
        return {
          ...prev,
          isConnected: false,
          connectionQuality: 'disconnected',
          isHealthy: false,
          missedPings: prev.missedPings + 1,
          ...metrics
        };
      });
    }
  }, [updateConnectionQuality, calculateMetrics]);

  const startHealthCheck = useCallback((ws: WebSocket) => {
    wsRef.current = ws;
    connectionStartRef.current = Date.now();
    
    // Clear any existing intervals
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }

    // Set up ping interval (every 30 seconds)
    pingIntervalRef.current = setInterval(ping, 30000);

    // Initial connection state
    const metrics = calculateMetrics();
    setHealth(prev => ({
      ...prev,
      isConnected: ws.readyState === WebSocket.OPEN,
      connectionQuality: ws.readyState === WebSocket.OPEN ? 'good' : 'disconnected',
      isHealthy: ws.readyState === WebSocket.OPEN,
      ...metrics
    }));

    // Listen for connection state changes
    ws.addEventListener('open', () => {
      const metrics = calculateMetrics();
      setHealth(prev => ({
        ...prev,
        isConnected: true,
        connectionQuality: 'good',
        isHealthy: true,
        reconnectAttempts: 0,
        ...metrics
      }));
    });

    ws.addEventListener('close', () => {
      lastDisconnectRef.current = Date.now();
      const metrics = calculateMetrics();
      setHealth(prev => ({
        ...prev,
        isConnected: false,
        connectionQuality: 'disconnected',
        isHealthy: false,
        ...metrics
      }));
    });

    ws.addEventListener('error', () => {
      if (lastDisconnectRef.current) {
        totalDowntimeRef.current += Date.now() - lastDisconnectRef.current;
      }
      const metrics = calculateMetrics();
      setHealth(prev => ({
        ...prev,
        isConnected: false,
        connectionQuality: 'disconnected',
        isHealthy: false,
        reconnectAttempts: prev.reconnectAttempts + 1,
        ...metrics
      }));
    });
  }, [ping, calculateMetrics]);

  const stopHealthCheck = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    wsRef.current = undefined;
    connectionStartRef.current = undefined;
    totalDowntimeRef.current = 0;
    pingTimesRef.current = [];
  }, []);

  const forceReconnect = useCallback(() => {
    setHealth(prev => ({
      ...prev,
      reconnectAttempts: 0
    }));
    
    if (wsRef.current) {
      wsRef.current.close();
    }
  }, []);

  useEffect(() => {
    return () => {
      stopHealthCheck();
    };
  }, [stopHealthCheck]);

  return {
    ...health,
    startHealthCheck,
    stopHealthCheck,
    forceReconnect
  };
};
