/**
 * Realtime Connection Manager
 * Central orchestrator to prevent connection explosion
 */

import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import { emergencyRealtimeBreaker } from '@/services/EmergencyRealtimeBreaker';
import { costTracker } from '@/services/CostTracker';

interface ConnectionManagerState {
  activeConnections: string[];
  totalConnectionCount: number;
  isEmergencyMode: boolean;
  maxConnectionsReached: boolean;
  blockedAttempts: number;
}

interface RealtimeConnectionManagerContextType {
  canCreateConnection: (contextName: string) => boolean;
  registerConnection: (contextName: string) => void;
  unregisterConnection: (contextName: string) => void;
  getConnectionStatus: () => ConnectionManagerState;
  forceDisconnectAll: () => void;
}

const RealtimeConnectionManagerContext = createContext<RealtimeConnectionManagerContextType | null>(null);

export const useRealtimeConnectionManager = () => {
  const context = useContext(RealtimeConnectionManagerContext);
  if (!context) {
    throw new Error('useRealtimeConnectionManager must be used within RealtimeConnectionManagerProvider');
  }
  return context;
};

interface RealtimeConnectionManagerProviderProps {
  children: ReactNode;
}

export const RealtimeConnectionManagerProvider = ({
  children
}: RealtimeConnectionManagerProviderProps) => {
  // 🚨 EMERGENCY LIMITS: Ultra-restrictive to prevent cost explosion
  const MAX_CONNECTIONS = 2; // Maximum 2 realtime connections total
  const CONNECTION_COOLDOWN = 10000; // 10 seconds between connection attempts
  
  const [state, setState] = useState<ConnectionManagerState>({
    activeConnections: [],
    totalConnectionCount: 0,
    isEmergencyMode: false,
    maxConnectionsReached: false,
    blockedAttempts: 0
  });

  const activeConnectionsRef = useRef<Set<string>>(new Set());
  const lastConnectionAttemptRef = useRef<Record<string, number>>({});
  const emergencyModeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Monitor emergency breaker status
  useEffect(() => {
    const handleEmergencyMode = () => {
      setState(prev => ({ ...prev, isEmergencyMode: true }));
      console.log('🚨 Connection Manager: Emergency mode activated');
      
      // Force disconnect all connections in emergency mode
      forceDisconnectAll();
    };

    const handleEmergencyExit = () => {
      setState(prev => ({ ...prev, isEmergencyMode: false }));
      console.log('✅ Connection Manager: Emergency mode deactivated');
    };

    window.addEventListener('realtime-emergency-mode', handleEmergencyMode);
    window.addEventListener('realtime-emergency-exit', handleEmergencyExit);

    return () => {
      window.removeEventListener('realtime-emergency-mode', handleEmergencyMode);
      window.removeEventListener('realtime-emergency-exit', handleEmergencyExit);
    };
  }, []);

  const canCreateConnection = useCallback((contextName: string): boolean => {
    // Emergency mode blocks all new connections
    if (!emergencyRealtimeBreaker.canAllowRealtimeOperation('connection')) {
      setState(prev => ({ ...prev, blockedAttempts: prev.blockedAttempts + 1 }));
      console.warn(`🚨 Connection Manager: Blocked connection attempt for ${contextName} (Emergency mode)`);
      return false;
    }

    // Maximum connections limit
    if (activeConnectionsRef.current.size >= MAX_CONNECTIONS) {
      setState(prev => ({ 
        ...prev, 
        maxConnectionsReached: true,
        blockedAttempts: prev.blockedAttempts + 1 
      }));
      console.warn(`🚨 Connection Manager: Max connections reached (${activeConnectionsRef.current.size}/${MAX_CONNECTIONS})`);
      return false;
    }

    // Connection cooldown per context
    const lastAttempt = lastConnectionAttemptRef.current[contextName] || 0;
    const now = Date.now();
    if (now - lastAttempt < CONNECTION_COOLDOWN) {
      const remaining = Math.ceil((CONNECTION_COOLDOWN - (now - lastAttempt)) / 1000);
      console.warn(`🚨 Connection Manager: ${contextName} must wait ${remaining}s before reconnecting`);
      return false;
    }

    return true;
  }, []);

  const registerConnection = useCallback((contextName: string): void => {
    if (activeConnectionsRef.current.has(contextName)) {
      console.warn(`⚠️ Connection Manager: ${contextName} already registered`);
      return;
    }

    activeConnectionsRef.current.add(contextName);
    lastConnectionAttemptRef.current[contextName] = Date.now();
    
    setState(prev => ({
      ...prev,
      activeConnections: Array.from(activeConnectionsRef.current),
      totalConnectionCount: activeConnectionsRef.current.size,
      maxConnectionsReached: activeConnectionsRef.current.size >= MAX_CONNECTIONS
    }));

    console.log(`✅ Connection Manager: Registered ${contextName} (${activeConnectionsRef.current.size}/${MAX_CONNECTIONS})`);
  }, []);

  const unregisterConnection = useCallback((contextName: string): void => {
    if (!activeConnectionsRef.current.has(contextName)) {
      return;
    }

    activeConnectionsRef.current.delete(contextName);
    
    setState(prev => ({
      ...prev,
      activeConnections: Array.from(activeConnectionsRef.current),
      totalConnectionCount: activeConnectionsRef.current.size,
      maxConnectionsReached: false
    }));

    console.log(`❌ Connection Manager: Unregistered ${contextName} (${activeConnectionsRef.current.size}/${MAX_CONNECTIONS})`);
  }, []);

  const forceDisconnectAll = useCallback((): void => {
    console.log('🚨 Connection Manager: Force disconnecting all connections');
    
    // Dispatch event for all contexts to disconnect
    window.dispatchEvent(new CustomEvent('force-disconnect-realtime'));
    
    // Clear local state
    activeConnectionsRef.current.clear();
    setState(prev => ({
      ...prev,
      activeConnections: [],
      totalConnectionCount: 0,
      maxConnectionsReached: false
    }));
  }, []);

  const getConnectionStatus = useCallback((): ConnectionManagerState => {
    return { ...state };
  }, [state]);

  const contextValue: RealtimeConnectionManagerContextType = {
    canCreateConnection,
    registerConnection,
    unregisterConnection,
    getConnectionStatus,
    forceDisconnectAll
  };

  return (
    <RealtimeConnectionManagerContext.Provider value={contextValue}>
      {children}
    </RealtimeConnectionManagerContext.Provider>
  );
};