import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isDevToolsEnabled } from '@/utils/featureFlags';

// Global Preview Control - Ensures only one live preview across all developers
// Uses Supabase Realtime presence for coordination

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
  const [state, setState] = useState<PreviewControlState>({
    isGlobalLeader: false,
    currentLeader: null,
    leaderName: null,
    sessionId: '',
    isEnforced: false, // Default off - can be enabled via feature flag
    participants: 0
  });

  const channelRef = useRef<any>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIdRef = useRef<string>('');
  const projectId = 'kmuoqkcxguafxulqlbmi'; // Fixed project ID

  // Generate unique session ID
  useEffect(() => {
    const sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionIdRef.current = sessionId;
    setState(prev => ({ ...prev, sessionId }));
  }, []);

  // Initialize global presence channel
  useEffect(() => {
    // Feature flag check - can be enabled later
    const isEnforced = false; // TODO: Replace with actual feature flag
    setState(prev => ({ ...prev, isEnforced }));

    if (!isEnforced || !sessionIdRef.current) return;

    const channelName = `preview_control:${projectId}`;
    
    if (isDevToolsEnabled()) {
      console.log('🌐 Joining global preview control channel:', channelName);
    }

    const channel = supabase.channel(channelName);
    channelRef.current = channel;

    // Join presence with metadata
    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const participants = Object.keys(presenceState).length;
        
        // Determine leader by earliest startedAt timestamp
        let earliestParticipant = null;
        let earliestTime = Infinity;

        for (const [key, presences] of Object.entries(presenceState)) {
          const presence = (presences as any[])[0]; // Get first presence
          if (presence?.startedAt < earliestTime) {
            earliestTime = presence.startedAt;
            earliestParticipant = presence;
          }
        }

        const isLeader = earliestParticipant?.sessionId === sessionIdRef.current;
        
        setState(prev => ({
          ...prev,
          isGlobalLeader: isLeader,
          currentLeader: earliestParticipant?.sessionId || null,
          leaderName: earliestParticipant?.name || 'Unknown',
          participants
        }));

        if (isDevToolsEnabled()) {
          console.log('🌐 Global leader election:', {
            isLeader,
            leader: earliestParticipant?.name,
            participants,
            sessionId: sessionIdRef.current
          });
        }
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        if (isDevToolsEnabled()) {
          console.log('🌐 Developer joined preview:', newPresences);
        }
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        if (isDevToolsEnabled()) {
          console.log('🌐 Developer left preview:', leftPresences);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track presence with metadata
          const userName = `Dev-${sessionIdRef.current.slice(-4)}`;
          await channel.track({
            sessionId: sessionIdRef.current,
            name: userName,
            startedAt: Date.now(),
            route: window.location.pathname,
            isActive: true
          });

          if (isDevToolsEnabled()) {
            console.log('🌐 Joined global preview control as:', userName);
          }
        }
      });

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };
  }, []);

  const requestControl = useCallback(() => {
    // Implementation for requesting control from current leader
    if (isDevToolsEnabled()) {
      console.log('🌐 Control request not implemented yet');
    }
  }, []);

  const releaseControl = useCallback(() => {
    // Implementation for voluntarily releasing control
    if (channelRef.current && state.isGlobalLeader) {
      channelRef.current.untrack();
      if (isDevToolsEnabled()) {
        console.log('🌐 Released global control');
      }
    }
  }, [state.isGlobalLeader]);

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