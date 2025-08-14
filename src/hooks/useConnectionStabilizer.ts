import { useState, useEffect, useRef } from 'react';

interface ConnectionStabilizerConfig {
  debounceMs?: number;
  stabilityThreshold?: number;
}

interface StabilizedConnection {
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  isStable: boolean;
  lastStableChange: Date | null;
}

export function useConnectionStabilizer(
  actualStatus: 'connecting' | 'connected' | 'disconnected' | 'error',
  config: ConnectionStabilizerConfig = {}
): StabilizedConnection {
  const { debounceMs = 500, stabilityThreshold = 2000 } = config;
  
  const [stabilizedStatus, setStabilizedStatus] = useState(actualStatus);
  const [isStable, setIsStable] = useState(false);
  const [lastStableChange, setLastStableChange] = useState<Date | null>(null);
  
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const stabilityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastChangeRef = useRef<Date>(new Date());

  useEffect(() => {
    // Clear existing debounce timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Clear existing stability timeout
    if (stabilityTimeoutRef.current) {
      clearTimeout(stabilityTimeoutRef.current);
    }

    // Mark as unstable immediately when status changes
    setIsStable(false);
    lastChangeRef.current = new Date();

    // Debounce status changes to prevent rapid cycling
    debounceTimeoutRef.current = setTimeout(() => {
      if (stabilizedStatus !== actualStatus) {
        setStabilizedStatus(actualStatus);
        setLastStableChange(new Date());
      }

      // Set stability timer
      stabilityTimeoutRef.current = setTimeout(() => {
        setIsStable(true);
      }, stabilityThreshold);
    }, debounceMs);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (stabilityTimeoutRef.current) {
        clearTimeout(stabilityTimeoutRef.current);
      }
    };
  }, [actualStatus, debounceMs, stabilityThreshold, stabilizedStatus]);

  return {
    status: stabilizedStatus,
    isStable,
    lastStableChange
  };
}