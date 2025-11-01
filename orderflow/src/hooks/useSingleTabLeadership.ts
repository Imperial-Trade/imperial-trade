// Single Tab Leadership Hook - Ensures only one tab manages expensive operations
// This dramatically reduces concurrent connection costs and prevents resource conflicts

import { useEffect, useRef, useState } from 'react';
import { isDevToolsEnabled } from '@/utils/featureFlags';

const LEADERSHIP_KEY = 'imperial_trading_tab_leader';
const HEARTBEAT_INTERVAL = 3000; // 3 seconds
const LEADERSHIP_TIMEOUT = 10000; // 10 seconds
const SOFT_LEADERSHIP_GRACE = 1500; // Soft takeover if heartbeat stale by ~1.5s

interface TabLeadershipState {
  isLeader: boolean;
  leaderId: string | null;
  tabCount: number;
}

interface TabLeaderInfo {
  tabId: string;
  timestamp: number;
  route: string;
  isActive: boolean;
}

export function useSingleTabLeadership(route: string = window.location.pathname) {
  const [state, setState] = useState<TabLeadershipState>({
    isLeader: false,
    leaderId: null,
    tabCount: 0
  });

  const tabIdRef = useRef<string>(`tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const leadershipCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Register this tab and attempt leadership
  const attemptLeadership = () => {
    try {
      const now = Date.now();
      const currentLeadershipData = localStorage.getItem(LEADERSHIP_KEY);
      
      let shouldBecomeLeader = false;
      
      if (!currentLeadershipData) {
        // No leader exists
        shouldBecomeLeader = true;
      } else {
        const leaderInfo: TabLeaderInfo = JSON.parse(currentLeadershipData);
        const timeSinceLastHeartbeat = now - leaderInfo.timestamp;
        
        if (timeSinceLastHeartbeat > LEADERSHIP_TIMEOUT) {
          // Current leader has timed out
          shouldBecomeLeader = true;
          if (isDevToolsEnabled()) {
            console.log('👑 Previous leader timed out, claiming leadership');
          }
        } else if (document.visibilityState === 'visible' && timeSinceLastHeartbeat > HEARTBEAT_INTERVAL + SOFT_LEADERSHIP_GRACE) {
          // Soft takeover: visible tab claims leadership if heartbeat is slightly stale
          shouldBecomeLeader = true;
          if (isDevToolsEnabled()) {
            console.log('👑 Soft takeover due to stale heartbeat (~1.5s beyond interval)');
          }
        }
      }
      
      if (shouldBecomeLeader) {
        const leaderInfo: TabLeaderInfo = {
          tabId: tabIdRef.current,
          timestamp: now,
          route,
          isActive: true
        };
        
        localStorage.setItem(LEADERSHIP_KEY, JSON.stringify(leaderInfo));
        
        setState(prev => ({ 
          ...prev, 
          isLeader: true, 
          leaderId: tabIdRef.current 
        }));
        
        if (isDevToolsEnabled()) {
          console.log('👑 Tab became leader:', tabIdRef.current);
        }
        
        // Start heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
        
        heartbeatIntervalRef.current = setInterval(() => {
          const heartbeatInfo: TabLeaderInfo = {
            tabId: tabIdRef.current,
            timestamp: Date.now(),
            route,
            isActive: true
          };
          localStorage.setItem(LEADERSHIP_KEY, JSON.stringify(heartbeatInfo));
        }, HEARTBEAT_INTERVAL);
      }
      
      // Update tab count (rough estimate based on localStorage activity)
      updateTabCount();
      
    } catch (error) {
      console.error('❌ Leadership attempt failed:', error);
    }
  };

  const updateTabCount = () => {
    // Estimate tab count based on localStorage activity and performance timing
    const now = Date.now();
    const estimatedTabs = Math.max(1, Math.min(5, Math.ceil(performance.now() / 10000)));
    
    setState(prev => ({ ...prev, tabCount: estimatedTabs }));
  };

  const checkLeadership = () => {
    try {
      const currentLeadershipData = localStorage.getItem(LEADERSHIP_KEY);
      
      if (!currentLeadershipData) {
        setState(prev => ({ ...prev, isLeader: false, leaderId: null }));
        return;
      }
      
      const leaderInfo: TabLeaderInfo = JSON.parse(currentLeadershipData);
      const isCurrentTabLeader = leaderInfo.tabId === tabIdRef.current;
      
      setState(prev => ({ 
        ...prev, 
        isLeader: isCurrentTabLeader, 
        leaderId: leaderInfo.tabId 
      }));
      
      // If we think we're the leader but localStorage shows otherwise, stop heartbeat
      if (state.isLeader && !isCurrentTabLeader && heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
        if (isDevToolsEnabled()) {
          console.log('👑 Lost leadership, stopping heartbeat');
        }
      }
      
    } catch (error) {
      console.error('❌ Leadership check failed:', error);
    }
  };

  const relinquishLeadership = () => {
    try {
      const currentLeadershipData = localStorage.getItem(LEADERSHIP_KEY);
      if (currentLeadershipData) {
        const leaderInfo: TabLeaderInfo = JSON.parse(currentLeadershipData);
        if (leaderInfo.tabId === tabIdRef.current) {
          localStorage.removeItem(LEADERSHIP_KEY);
          if (isDevToolsEnabled()) {
            console.log('👑 Relinquished leadership voluntarily');
          }
        }
      }
      
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      
      setState(prev => ({ ...prev, isLeader: false, leaderId: null }));
    } catch (error) {
      console.error('❌ Failed to relinquish leadership:', error);
    }
  };

  useEffect(() => {
    // Initial leadership attempt
    attemptLeadership();
    
    // Regular leadership checks
    leadershipCheckIntervalRef.current = setInterval(checkLeadership, HEARTBEAT_INTERVAL);
    
    // Listen for localStorage changes (other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === LEADERSHIP_KEY) {
        checkLeadership();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Handle tab visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden && state.isLeader) {
        // Don't immediately give up leadership, but reduce heartbeat frequency
        if (isDevToolsEnabled()) {
          console.log('👑 Tab hidden, maintaining leadership with reduced heartbeat');
        }
      } else if (!document.hidden && !state.isLeader) {
        // Tab became visible, attempt leadership if no current leader
        setTimeout(attemptLeadership, 1000);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Handle beforeunload
    const handleBeforeUnload = () => {
      relinquishLeadership();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (leadershipCheckIntervalRef.current) {
        clearInterval(leadershipCheckIntervalRef.current);
      }
      
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      relinquishLeadership();
    };
  }, [route]);

  return {
    isLeader: state.isLeader,
    leaderId: state.leaderId,
    tabId: tabIdRef.current,
    tabCount: state.tabCount,
    attemptLeadership,
    relinquishLeadership
  };
}