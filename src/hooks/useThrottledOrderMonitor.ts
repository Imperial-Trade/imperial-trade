import { useEffect, useRef, useCallback } from 'react';
import { useOrderTriggerMonitor } from './useOrderTriggerMonitor';
import { useAuth } from '@/contexts/AuthContext';

interface UseThrottledOrderMonitorOptions {
  enabled: boolean;
  hasPendingLimits: boolean;
  intervalMs?: number;
}

export const useThrottledOrderMonitor = ({ 
  enabled, 
  hasPendingLimits, 
  intervalMs = 15000 
}: UseThrottledOrderMonitorOptions) => {
  const { user } = useAuth();
  const { triggerOrderMonitor } = useOrderTriggerMonitor(user?.id);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastCallRef = useRef<number>(0);
  const isRunningRef = useRef<boolean>(false);
  
  // Page Visibility API support
  const isTabVisible = useRef<boolean>(!document.hidden);
  
  useEffect(() => {
    const handleVisibilityChange = () => {
      isTabVisible.current = !document.hidden;
      console.log(`👁️ Tab visibility changed: ${isTabVisible.current ? 'visible' : 'hidden'}`);
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const runMonitor = useCallback(async () => {
    // Throttle: ensure minimum 15s between calls
    const now = Date.now();
    if (now - lastCallRef.current < intervalMs) {
      console.log(`⏸️ Monitor throttled: ${Math.ceil((intervalMs - (now - lastCallRef.current)) / 1000)}s remaining`);
      return;
    }

    // Skip if already running
    if (isRunningRef.current) {
      console.log('⏸️ Monitor already running, skipping...');
      return;
    }

    // Skip if tab is hidden (Page Visibility API)
    if (!isTabVisible.current) {
      console.log('⏸️ Tab hidden, skipping monitor run');
      return;
    }

    // Skip if no pending limits
    if (!hasPendingLimits) {
      console.log('⏸️ No pending limit orders, skipping monitor');
      return;
    }

    console.log('🚀 Running throttled order monitor...');
    isRunningRef.current = true;
    lastCallRef.current = now;

    try {
      const success = await triggerOrderMonitor();
      if (success) {
        console.log('✅ Order monitor completed successfully');
      } else {
        console.log('⚠️ Order monitor completed with issues');
      }
    } catch (error) {
      console.error('❌ Order monitor failed:', error);
    } finally {
      isRunningRef.current = false;
    }
  }, [triggerOrderMonitor, intervalMs, hasPendingLimits]);

  useEffect(() => {
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Only start monitoring if enabled and we have pending limits
    if (!enabled || !hasPendingLimits) {
      console.log(`📊 Order monitor: enabled=${enabled}, hasPendingLimits=${hasPendingLimits}`);
      return;
    }

    console.log(`🔄 Starting throttled order monitor (${intervalMs}ms interval)`);

    // Run immediately if conditions are met
    runMonitor();

    // Set up interval
    intervalRef.current = setInterval(runMonitor, intervalMs);

    return () => {
      if (intervalRef.current) {
        console.log('🛑 Stopping throttled order monitor');
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, hasPendingLimits, intervalMs, runMonitor]);

  return {
    isRunning: isRunningRef.current,
    lastRun: lastCallRef.current,
    manualTrigger: runMonitor
  };
};