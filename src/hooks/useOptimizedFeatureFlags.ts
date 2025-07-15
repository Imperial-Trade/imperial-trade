
import { useState, useEffect, useCallback, useRef } from 'react';
import { usePostHog } from '@/contexts/PostHogContext';

// Performance optimization: Feature flag caching with TTL
interface CachedFlag {
  value: boolean | string;
  timestamp: number;
  ttl: number;
}

class FeatureFlagCache {
  private cache = new Map<string, CachedFlag>();
  private readonly defaultTTL = 300000; // 5 minutes

  get(flagName: string): boolean | string | null {
    const cached = this.cache.get(flagName);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      this.cache.delete(flagName);
      return null;
    }

    return cached.value;
  }

  set(flagName: string, value: boolean | string, ttl = this.defaultTTL): void {
    this.cache.set(flagName, {
      value,
      timestamp: Date.now(),
      ttl,
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

export function useOptimizedFeatureFlags() {
  const { getFeatureFlag, onFeatureFlags, isEnabled } = usePostHog();
  const [flags, setFlags] = useState<Record<string, boolean | string>>({});
  
  // Performance optimization: Cached feature flags
  const flagCache = useRef(new FeatureFlagCache()).current;
  const lastFlagUpdate = useRef(0);

  useEffect(() => {
    if (!isEnabled) return;
    
    // Throttle feature flag updates to once per 30 seconds
    const now = Date.now();
    if (now - lastFlagUpdate.current < 30000) return;
    
    onFeatureFlags((newFlags) => {
      setFlags(newFlags);
      lastFlagUpdate.current = now;
      
      // Update cache
      Object.entries(newFlags).forEach(([key, value]) => {
        flagCache.set(key, value);
      });
    });
  }, [onFeatureFlags, isEnabled, flagCache]);

  // Performance optimized flag getter with caching
  const getFlag = useCallback((flagName: string, defaultValue: boolean = false): boolean => {
    if (!isEnabled) return defaultValue;
    
    // Check cache first
    const cachedValue = flagCache.get(flagName);
    if (cachedValue !== null) {
      return typeof cachedValue === 'boolean' ? cachedValue : cachedValue.toLowerCase() === 'true';
    }
    
    // Fallback to PostHog
    const flagValue = getFeatureFlag(flagName);
    let result = defaultValue;
    
    if (typeof flagValue === 'boolean') {
      result = flagValue;
    } else if (typeof flagValue === 'string') {
      result = flagValue.toLowerCase() === 'true';
    }
    
    // Cache the result
    flagCache.set(flagName, result);
    return result;
  }, [isEnabled, getFeatureFlag, flagCache]);

  const getStringFlag = useCallback((flagName: string, defaultValue: string = ''): string => {
    if (!isEnabled) return defaultValue;
    
    const cachedValue = flagCache.get(flagName);
    if (cachedValue !== null) {
      return typeof cachedValue === 'string' ? cachedValue : String(cachedValue);
    }
    
    const flagValue = getFeatureFlag(flagName);
    const result = typeof flagValue === 'string' ? flagValue : defaultValue;
    
    flagCache.set(flagName, result);
    return result;
  }, [isEnabled, getFeatureFlag, flagCache]);

  // Predefined feature flag helpers (cached)
  const ui = {
    newDashboard: useCallback(() => getFlag('new_dashboard_ui'), [getFlag]),
    enhancedOnboarding: useCallback(() => getFlag('enhanced_onboarding'), [getFlag]),
    newSignalUI: useCallback(() => getFlag('new_signal_ui'), [getFlag]),
    advancedCharts: useCallback(() => getFlag('advanced_charts'), [getFlag]),
  };

  const admin = {
    advancedPanel: useCallback(() => getFlag('advanced_admin_panel'), [getFlag]),
    bulkActions: useCallback(() => getFlag('bulk_user_actions'), [getFlag]),
  };

  const trading = {
    advancedSignals: useCallback(() => getFlag('advanced_signals'), [getFlag]),
    realTimePrices: useCallback(() => getFlag('real_time_prices'), [getFlag]),
    aiAssistant: useCallback(() => getFlag('ai_assistant'), [getFlag]),
  };

  return {
    flags,
    getFlag,
    getStringFlag,
    ui,
    admin,
    trading,
    clearCache: flagCache.clear.bind(flagCache),
  };
}
