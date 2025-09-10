// 🔥 GLOBAL REALTIME HEALTH MONITOR
// Prevents multiple contexts from overwhelming the database

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { isDevToolsEnabled } from '@/utils/featureFlags';

interface HealthMetrics {
  totalConnections: number;
  totalReconnections: number;
  totalDatabaseQueries: number;
  totalRealtimeMessages: number;
  lastActivity: Date | null;
}

interface RealtimeHealthContextType {
  metrics: HealthMetrics;
  registerConnection: (contextName: string) => void;
  unregisterConnection: (contextName: string) => void;
  recordReconnection: (contextName: string) => void;
  recordDatabaseQuery: (contextName: string, queryType: string) => void;
  recordRealtimeMessage: (contextName: string, messageType: string) => void;
  isSystemHealthy: () => boolean;
}

const RealtimeHealthContext = createContext<RealtimeHealthContextType | null>(null);

export const useRealtimeHealth = () => {
  const context = useContext(RealtimeHealthContext);
  if (!context) {
    return {
      metrics: { totalConnections: 0, totalReconnections: 0, totalDatabaseQueries: 0, totalRealtimeMessages: 0, lastActivity: null },
      registerConnection: () => {},
      unregisterConnection: () => {},
      recordReconnection: () => {},
      recordDatabaseQuery: () => {},
      recordRealtimeMessage: () => {},
      isSystemHealthy: () => true
    };
  }
  return context;
};

export const RealtimeHealthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [metrics, setMetrics] = useState<HealthMetrics>({
    totalConnections: 0,
    totalReconnections: 0,
    totalDatabaseQueries: 0,
    totalRealtimeMessages: 0,
    lastActivity: null
  });

  const activeConnections = useRef<Set<string>>(new Set());
  const activityThresholds = useRef({
    maxReconnectionsPerMinute: 5,
    maxQueriesPerMinute: 20,
    maxMessagesPerSecond: 50
  });

  const registerConnection = (contextName: string) => {
    activeConnections.current.add(contextName);
    setMetrics(prev => ({
      ...prev,
      totalConnections: activeConnections.current.size,
      lastActivity: new Date()
    }));
    
    if (isDevToolsEnabled()) {
      console.log(`📊 RealtimeHealth: ${contextName} registered (${activeConnections.current.size} total)`);
    }
  };

  const unregisterConnection = useCallback((contextName: string) => {
    activeConnections.current.delete(contextName);
    setMetrics(prev => ({
      ...prev,
      totalConnections: activeConnections.current.size,
      lastActivity: new Date()
    }));
    
    if (isDevToolsEnabled()) {
      console.log(`📊 RealtimeHealth: ${contextName} unregistered (${activeConnections.current.size} remaining)`);
    }
  }, []);

  const recordReconnection = (contextName: string) => {
    setMetrics(prev => ({
      ...prev,
      totalReconnections: prev.totalReconnections + 1,
      lastActivity: new Date()
    }));
    
    if (isDevToolsEnabled()) {
      console.log(`🔄 RealtimeHealth: ${contextName} reconnection recorded (${metrics.totalReconnections + 1} total)`);
    }
  };

  const recordDatabaseQuery = (contextName: string, queryType: string) => {
    setMetrics(prev => ({
      ...prev,
      totalDatabaseQueries: prev.totalDatabaseQueries + 1,
      lastActivity: new Date()
    }));
  };

  const recordRealtimeMessage = (contextName: string, messageType: string) => {
    setMetrics(prev => ({
      ...prev,
      totalRealtimeMessages: prev.totalRealtimeMessages + 1,
      lastActivity: new Date()
    }));
  };

  const isSystemHealthy = (): boolean => {
    // Check if we're overwhelming the system
    return metrics.totalConnections <= 3 && 
           activeConnections.current.size <= 2;
  };

  // Reset counters every minute to track rates
  useEffect(() => {
    const resetInterval = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        totalReconnections: 0,
        totalDatabaseQueries: 0,
        totalRealtimeMessages: 0
      }));
    }, 60000);

    return () => clearInterval(resetInterval);
  }, []);

  // Log system health every 30 seconds in dev mode
  useEffect(() => {
    if (!isDevToolsEnabled()) return;
    
    const logInterval = setInterval(() => {
      console.log('📊 RealtimeHealth Status:', {
        activeConnections: Array.from(activeConnections.current),
        metrics,
        isHealthy: isSystemHealthy()
      });
    }, 30000);

    return () => clearInterval(logInterval);
  }, [metrics]);

  const contextValue: RealtimeHealthContextType = {
    metrics,
    registerConnection,
    unregisterConnection,
    recordReconnection,
    recordDatabaseQuery,
    recordRealtimeMessage,
    isSystemHealthy
  };

  return (
    <RealtimeHealthContext.Provider value={contextValue}>
      {children}
    </RealtimeHealthContext.Provider>
  );
};