import { useState, useCallback } from 'react';

export interface AnimationPreferences {
  enabled: boolean;
  sensitivity: 'low' | 'medium' | 'high';
  duration: 'fast' | 'normal' | 'slow';
  showIntensity: boolean;
}

const DEFAULT_PREFERENCES: AnimationPreferences = {
  enabled: true,
  sensitivity: 'medium',
  duration: 'normal',
  showIntensity: true
};

const SENSITIVITY_MULTIPLIERS = {
  low: 2.0,    // Higher threshold = less sensitive
  medium: 1.0, // Default threshold
  high: 0.5    // Lower threshold = more sensitive
};

const DURATION_VALUES = {
  fast: 400,   // Quick flash
  normal: 700, // Standard duration
  slow: 1000   // Longer animation
};

/**
 * Hook for managing user animation preferences
 */
export function useAnimationPreferences() {
  const [preferences, setPreferences] = useState<AnimationPreferences>(() => {
    const saved = localStorage.getItem('animation-preferences');
    return saved ? { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) } : DEFAULT_PREFERENCES;
  });

  const updatePreference = useCallback((key: keyof AnimationPreferences, value: any) => {
    const updated = { ...preferences, [key]: value };
    setPreferences(updated);
    localStorage.setItem('animation-preferences', JSON.stringify(updated));
  }, [preferences]);

  const getThresholdMultiplier = useCallback(() => {
    return SENSITIVITY_MULTIPLIERS[preferences.sensitivity];
  }, [preferences.sensitivity]);

  const getAnimationDuration = useCallback(() => {
    return DURATION_VALUES[preferences.duration];
  }, [preferences.duration]);

  const shouldShowAnimation = useCallback((changePercent: number, baseThreshold: number) => {
    if (!preferences.enabled) return false;
    
    const adjustedThreshold = baseThreshold * getThresholdMultiplier();
    return changePercent >= adjustedThreshold;
  }, [preferences.enabled, getThresholdMultiplier]);

  const getAnimationClass = useCallback((direction: 'up' | 'down', isSignificant: boolean) => {
    if (!preferences.enabled) return '';
    
    const baseClass = direction === 'up' ? 'animate-flash-green' : 'animate-flash-red';
    
    if (preferences.showIntensity && isSignificant) {
      return direction === 'up' ? 'animate-flash-green-intense' : 'animate-flash-red-intense';
    }
    
    return baseClass;
  }, [preferences.enabled, preferences.showIntensity]);

  return {
    preferences,
    updatePreference,
    getThresholdMultiplier,
    getAnimationDuration,
    shouldShowAnimation,
    getAnimationClass
  };
}