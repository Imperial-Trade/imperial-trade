
import { useState, useEffect } from 'react';
import { usePostHog } from '@/contexts/PostHogContext';

export function useFeatureFlags() {
  const { getFeatureFlag, onFeatureFlags, isEnabled } = usePostHog();
  const [flags, setFlags] = useState<Record<string, boolean | string>>({});

  useEffect(() => {
    if (!isEnabled) return;
    
    onFeatureFlags((newFlags) => {
      setFlags(newFlags);
    });
  }, [onFeatureFlags, isEnabled]);

  // Helper function to safely get feature flag with tracking
  const getFlag = (flagName: string, defaultValue: boolean = false): boolean => {
    if (!isEnabled) return defaultValue;
    
    const flagValue = getFeatureFlag(flagName);
    
    // Handle different return types from PostHog
    if (typeof flagValue === 'boolean') {
      return flagValue;
    } else if (typeof flagValue === 'string') {
      // Convert string to boolean (PostHog sometimes returns strings)
      return flagValue.toLowerCase() === 'true';
    }
    
    return defaultValue;
  };

  // Helper function to get string feature flag
  const getStringFlag = (flagName: string, defaultValue: string = ''): string => {
    if (!isEnabled) return defaultValue;
    
    const flagValue = getFeatureFlag(flagName);
    return typeof flagValue === 'string' ? flagValue : defaultValue;
  };

  // Track flag evaluation function
  const trackFeatureFlag = (flagName: string, flagValue: boolean | string, context?: any) => {
    // This will be called by the tracking hook when needed
    console.log(`Feature flag evaluated: ${flagName} = ${flagValue}`, context);
  };

  // Specific feature flag helpers
  const ui = {
    newDashboard: () => getFlag('new_dashboard_ui'),
    enhancedOnboarding: () => getFlag('enhanced_onboarding'),
    newSignalUI: () => getFlag('new_signal_ui'),
    advancedCharts: () => getFlag('advanced_charts'),
    darkModeDefault: () => getFlag('dark_mode_default'),
  };

  const admin = {
    advancedPanel: () => getFlag('advanced_admin_panel'),
    bulkActions: () => getFlag('bulk_user_actions'),
    advancedAnalytics: () => getFlag('advanced_analytics'),
  };

  const education = {
    interactiveQuizzes: () => getFlag('interactive_quizzes'),
    progressTracking: () => getFlag('progress_tracking'),
    certifications: () => getFlag('certifications'),
  };

  const trading = {
    advancedSignals: () => getFlag('advanced_signals'),
    realTimePrices: () => getFlag('real_time_prices'),
    socialTrading: () => getFlag('social_trading'),
    aiAssistant: () => getFlag('ai_assistant'),
  };

  const experimental = {
    betaFeatures: () => getFlag('beta_features'),
    debugMode: () => getFlag('debug_mode'),
    performanceOptimizations: () => getFlag('performance_optimizations'),
  };

  return {
    flags,
    getFlag,
    getStringFlag,
    trackFeatureFlag,
    ui,
    admin,
    education,
    trading,
    experimental,
  };
}
