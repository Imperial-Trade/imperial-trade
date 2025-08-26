
import { useState, useEffect, useCallback, useRef } from 'react';

interface WebSocketHealth {
  isConnected: boolean;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  lastPingTime: number | null;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected';
}

interface UseWebSocketHealthReturn extends WebSocketHealth {
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
    connectionQuality: 'disconnected'
  });

  const pingIntervalRef = useRef<NodeJS.Timeout>();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const wsRef = useRef<WebSocket>();

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

  const ping = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setHealth(prev => ({
        ...prev,
        isConnected: false,
        connectionQuality: 'disconnected'
      }));
      return;
    }

    const startTime = performance.now();
    
    // Send ping
    try {
      wsRef.current.send(JSON.stringify({ type: 'ping', timestamp: startTime }));
      
      // Set up pong listener (this is simplified - in real implementation you'd handle the pong response)
      const pingTime = performance.now() - startTime;
      
      setHealth(prev => ({
        ...prev,
        isConnected: true,
        lastPingTime: pingTime,
        connectionQuality: updateConnectionQuality(pingTime),
        reconnectAttempts: 0
      }));
    } catch (error) {
      console.warn('WebSocket ping failed:', error);
      setHealth(prev => ({
        ...prev,
        isConnected: false,
        connectionQuality: 'disconnected'
      }));
    }
  }, [updateConnectionQuality]);

  const startHealthCheck = useCallback((ws: WebSocket) => {
    wsRef.current = ws;
    
    // Clear any existing intervals
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }

    // Set up ping interval (every 30 seconds)
    pingIntervalRef.current = setInterval(ping, 30000);

    // Initial connection state
    setHealth(prev => ({
      ...prev,
      isConnected: ws.readyState === WebSocket.OPEN,
      connectionQuality: ws.readyState === WebSocket.OPEN ? 'good' : 'disconnected'
    }));

    // Listen for connection state changes
    ws.addEventListener('open', () => {
      setHealth(prev => ({
        ...prev,
        isConnected: true,
        connectionQuality: 'good',
        reconnectAttempts: 0
      }));
    });

    ws.addEventListener('close', () => {
      setHealth(prev => ({
        ...prev,
        isConnected: false,
        connectionQuality: 'disconnected'
      }));
    });

    ws.addEventListener('error', () => {
      setHealth(prev => ({
        ...prev,
        isConnected: false,
        connectionQuality: 'disconnected',
        reconnectAttempts: prev.reconnectAttempts + 1
      }));
    });
  }, [ping]);

  const stopHealthCheck = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    wsRef.current = undefined;
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
