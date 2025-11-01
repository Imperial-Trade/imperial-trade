import React, { createContext, useContext, useState, useRef, useCallback } from 'react';

// Telemetry event types for per-channel tracking
export type TelemetryEvent = 
  | 'price_update'      // v2 events
  | 'price_update_v3'   // v3 events
  | 'db_change_v3'      // SharedRealtime events
  | 'signal_change_v3'  // SignalRealtime events
  | 'clamp_activation'; // Rate limit activations

export interface TelemetryCounters {
  price_update: number;
  price_update_v3: number;
  db_change_v3: number;
  signal_change_v3: number;
  clamp_activation: number;
}

export interface SessionInfo {
  sessionId: string;
  buildVersion: string;
  startTime: Date;
}

export interface TelemetryContextType {
  counters: TelemetryCounters;
  sessionInfo: SessionInfo;
  record: (event: TelemetryEvent) => void;
  reset: () => void;
  getStats: () => {
    totalEvents: number;
    eventsPerMinute: number;
    sessionDuration: number;
  };
}

const TelemetryContext = createContext<TelemetryContextType | null>(null);

export const useTelemetry = () => {
  const context = useContext(TelemetryContext);
  if (!context) {
    throw new Error('useTelemetry must be used within TelemetryProvider');
  }
  return context;
};

interface TelemetryProviderProps {
  children: React.ReactNode;
}

export const TelemetryProvider: React.FC<TelemetryProviderProps> = ({ children }) => {
  const sessionInfo = useRef<SessionInfo>({
    sessionId: crypto.randomUUID(),
    buildVersion: import.meta.env.VITE_BUILD_ID || 'dev',
    startTime: new Date()
  });

  const [counters, setCounters] = useState<TelemetryCounters>({
    price_update: 0,
    price_update_v3: 0,
    db_change_v3: 0,
    signal_change_v3: 0,
    clamp_activation: 0
  });

  const record = useCallback((event: TelemetryEvent) => {
    setCounters(prev => ({
      ...prev,
      [event]: prev[event] + 1
    }));
  }, []);

  const reset = useCallback(() => {
    setCounters({
      price_update: 0,
      price_update_v3: 0,
      db_change_v3: 0,
      signal_change_v3: 0,
      clamp_activation: 0
    });
    sessionInfo.current = {
      sessionId: crypto.randomUUID(),
      buildVersion: import.meta.env.VITE_BUILD_ID || 'dev',
      startTime: new Date()
    };
  }, []);

  const getStats = useCallback(() => {
    const totalEvents = Object.values(counters).reduce((sum, count) => sum + count, 0);
    const sessionDuration = (Date.now() - sessionInfo.current.startTime.getTime()) / 1000; // seconds
    const eventsPerMinute = sessionDuration > 0 ? (totalEvents / sessionDuration) * 60 : 0;

    return {
      totalEvents,
      eventsPerMinute,
      sessionDuration
    };
  }, [counters]);

  const value: TelemetryContextType = {
    counters,
    sessionInfo: sessionInfo.current,
    record,
    reset,
    getStats
  };

  return (
    <TelemetryContext.Provider value={value}>
      {children}
    </TelemetryContext.Provider>
  );
};