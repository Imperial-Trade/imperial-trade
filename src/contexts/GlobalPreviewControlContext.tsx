import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { isDevToolsEnabled } from '@/utils/featureFlags';

// Global Preview Control - Ensures only one live preview across all developers
// 🔥 PRIORITY 3: Uses localStorage for coordination (NO Realtime Connection)

interface PreviewControlState {
  isGlobalLeader: boolean;
  currentLeader: string | null;
  leaderName: string | null;
  sessionId: string;
  isEnforced: boolean; // Feature flag control
  participants: number;
}

interface PreviewControlContextType extends PreviewControlState {
  requestControl: () => void;
  releaseControl: () => void;
  getControlStatus: () => PreviewControlState;
}

const PreviewControlContext = createContext<PreviewControlContextType | null>(null);

export const useGlobalPreviewControl = () => {
  const context = useContext(PreviewControlContext);
  if (!context) {
    throw new Error('useGlobalPreviewControl must be used within GlobalPreviewControlProvider');
  }
  return context;
};

interface GlobalPreviewControlProviderProps {
  children: React.ReactNode;
}

export const GlobalPreviewControlProvider: React.FC<GlobalPreviewControlProviderProps> = ({
  children
}) => {
  const mountOnlyRef = useRef(false);
  const [state, setState] = useState<PreviewControlState>({
    isGlobalLeader: false,
    currentLeader: null,
    leaderName: null,
    sessionId: '',
    isEnforced: false,
    participants: 0
  });

  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIdRef = useRef<string>('');

  // Generate unique session ID
  useEffect(() => {
    const sessionId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionIdRef.current = sessionId;
    setState(prev => ({ ...prev, sessionId }));
  }, []);

  // 🔥 PRIORITY 3: localStorage-based Tab Leadership (NO Realtime Connection)
  useEffect(() => {
    mountOnlyRef.current = true;
    
    // Always disabled - no Realtime presence channel needed
    const isEnforced = false;
    setState(prev => ({ ...prev, isEnforced }));

    // Use localStorage for tab coordination instead of Supabase presence
    const STORAGE_KEY = 'preview_tabs';
    const HEARTBEAT_INTERVAL = 5000; // Update every 5 seconds
    const STALE_THRESHOLD = 15000; // Consider tab stale after 15 seconds

    const updateTabPresence = () => {
      try {
        // Read existing tabs
        const stored = localStorage.getItem(STORAGE_KEY);
        const tabs = stored ? JSON.parse(stored) : {};
        
        // Clean up stale tabs
        const now = Date.now();
        Object.keys(tabs).forEach(tabId => {
          if (now - tabs[tabId].timestamp > STALE_THRESHOLD) {
            delete tabs[tabId];
          }
        });

        // Update this tab
        tabs[sessionIdRef.current] = {
          timestamp: now,
          route: window.location.pathname,
          name: `Tab-${sessionIdRef.current.slice(-4)}`
        };

        // Save back to localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));

        // Determine leader (earliest timestamp)
        let earliestTab = null;
        let earliestTime = Infinity;
        let totalTabs = 0;

        Object.entries(tabs).forEach(([tabId, data]: [string, any]) => {
          totalTabs++;
          if (data.timestamp < earliestTime) {
            earliestTime = data.timestamp;
            earliestTab = { sessionId: tabId, ...data };
          }
        });

        const isLeader = earliestTab?.sessionId === sessionIdRef.current;

        setState(prev => ({
          ...prev,
          isGlobalLeader: isLeader,
          currentLeader: earliestTab?.sessionId || null,
          leaderName: earliestTab?.name || 'Unknown',
          participants: totalTabs
        }));

        if (isDevToolsEnabled()) {
          console.log('📑 localStorage Tab Leadership:', {
            isLeader,
            leader: earliestTab?.name,
            totalTabs,
            sessionId: sessionIdRef.current
          });
        }
      } catch (error) {
        console.error('Error updating tab presence:', error);
      }
    };

    // Initial update
    updateTabPresence();

    // Start heartbeat
    heartbeatIntervalRef.current = setInterval(updateTabPresence, HEARTBEAT_INTERVAL);

    // Cleanup on unmount
    return () => {
      mountOnlyRef.current = false;
      
      // Remove this tab from localStorage
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const tabs = JSON.parse(stored);
          delete tabs[sessionIdRef.current];
          localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
        }
      } catch (error) {
        console.error('Error cleaning up tab presence:', error);
      }

      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }

      if (isDevToolsEnabled()) {
        console.log('📑 Tab removed from localStorage leadership');
      }
    };
  }, []); // Mount-only, never re-run

  const requestControl = useCallback(() => {
    // Implementation for requesting control from current leader
    if (isDevToolsEnabled()) {
      console.log('📑 Control request not implemented yet');
    }
  }, []);

  const releaseControl = useCallback(() => {
    // Implementation for voluntarily releasing control
    if (isDevToolsEnabled()) {
      console.log('📑 Released local control');
    }
  }, []);

  const getControlStatus = useCallback(() => state, [state]);

  const contextValue: PreviewControlContextType = {
    ...state,
    requestControl,
    releaseControl,
    getControlStatus
  };

  return (
    <PreviewControlContext.Provider value={contextValue}>
      {children}
    </PreviewControlContext.Provider>
  );
};
