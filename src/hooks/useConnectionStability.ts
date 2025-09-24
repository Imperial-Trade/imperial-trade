import React, { useRef, useCallback } from 'react';

interface StabilityConfig {
  stabilityThreshold: number; // Time in ms for stability lock
  cooldownPeriod: number; // Cooldown before allowing changes
}

interface StabilityState {
  isStable: boolean;
  stableQuality: 'live' | 'hydrated' | 'stale' | null;
  lockedAt: number | null;
  lastQualityChange: number;
}

const DEFAULT_CONFIG: StabilityConfig = {
  stabilityThreshold: 2000, // 🔥 OPTIMIZED: Reduced to 2s for even faster response
  cooldownPeriod: 500, // 🔥 OPTIMIZED: Reduced to 500ms for responsiveness
};

/**
 * 🎯 FLICKER ELIMINATION: Connection Stability Management
 * 
 * This hook provides stability locking to prevent micro-state transitions
 * once a connection quality has been stable for the specified threshold.
 * 
 * Priority 2: Eliminate Micro-State Transitions
 * - Once connection is stable for 10+ seconds, lock the visual state
 * - Only allow quality changes when actual connection status changes
 * - Disable quality micro-adjustments during stable periods
 */
export const useConnectionStability = (config: Partial<StabilityConfig> = {}) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const stabilityStateRef = useRef<Map<string, StabilityState>>(new Map());
  
  const shouldAllowQualityChange = useCallback((
    symbol: string, 
    currentQuality: 'live' | 'hydrated' | 'stale',
    proposedQuality: 'live' | 'hydrated' | 'stale'
  ): boolean => {
    const now = Date.now();
    const normalizedSymbol = symbol.toLowerCase();
    const state = stabilityStateRef.current.get(normalizedSymbol);
    
    // First time - allow immediate change
    if (!state) {
      stabilityStateRef.current.set(normalizedSymbol, {
        isStable: false,
        stableQuality: proposedQuality,
        lockedAt: null,
        lastQualityChange: now
      });
      return true;
    }
    
    // No change proposed - maintain current state
    if (currentQuality === proposedQuality) {
      // Check if we should lock this stable state
      if (!state.isStable && (now - state.lastQualityChange) > finalConfig.stabilityThreshold) {
        stabilityStateRef.current.set(normalizedSymbol, {
          ...state,
          isStable: true,
          stableQuality: currentQuality,
          lockedAt: now
        });
      }
      return false; // No change needed
    }
    
    // Quality change is proposed
    // If we're in stable mode, only allow major connection status changes
    if (state.isStable) {
      const isSignificantChange = (
        // Allow transitions from/to 'stale' (connection issues)
        (currentQuality === 'stale' || proposedQuality === 'stale') ||
        // Allow transitions from/to 'live' (actual real-time data)
        (currentQuality === 'live' || proposedQuality === 'live')
      );
      
      if (!isSignificantChange) {
        console.log(`🔒 [STABILITY] Blocking micro-transition ${currentQuality} → ${proposedQuality} (stable for ${(now - state.lockedAt!)/1000}s)`);
        return false;
      }
      
      // Significant change detected - unlock and allow
      console.log(`🔓 [STABILITY] Allowing significant change ${currentQuality} → ${proposedQuality} (was stable for ${(now - state.lockedAt!)/1000}s)`);
    }
    
    // Check cooldown period
    if ((now - state.lastQualityChange) < finalConfig.cooldownPeriod) {
      return false;
    }
    
    // Allow the change and reset stability
    stabilityStateRef.current.set(normalizedSymbol, {
      isStable: false,
      stableQuality: proposedQuality,
      lockedAt: null,
      lastQualityChange: now
    });
    
    return true;
  }, [finalConfig]);
  
  const getStabilityInfo = useCallback((symbol: string) => {
    const normalizedSymbol = symbol.toLowerCase();
    const state = stabilityStateRef.current.get(normalizedSymbol);
    
    if (!state) {
      return { isStable: false, stableDuration: 0 };
    }
    
    const now = Date.now();
    const stableDuration = state.isStable && state.lockedAt 
      ? now - state.lockedAt 
      : now - state.lastQualityChange;
    
    return { 
      isStable: state.isStable, 
      stableDuration: Math.max(0, stableDuration),
      stableQuality: state.stableQuality
    };
  }, []);
  
  const clearStability = useCallback((symbol: string) => {
    const normalizedSymbol = symbol.toLowerCase();
    stabilityStateRef.current.delete(normalizedSymbol);
  }, []);
  
  return {
    shouldAllowQualityChange,
    getStabilityInfo,
    clearStability
  };
};