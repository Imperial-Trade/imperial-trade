
import { useState, useEffect } from 'react';
import { usePostHogTracking } from './usePostHogTracking';

export function useFeatureFlags() {
  const { featureFlags, trackFeatureFlag, onFeatureFlags } = usePostHogTracking();
  const [flags, setFlags] = useState<Record<string, boolean | string>>({});

  useEffect(() => {
    onFeatureFlags((newFlags) => {
      setFlags(newFlags);
    });
  }, [onFeatureFlags]);

  // Helper function to safely get feature flag with tracking
  const getFlag = (flagName: string, defaultValue: boolean = false): boolean => {
    const flagValue = featureFlags[flagName];
    const result = typeof flagValue === 'boolean' ? flagValue : defaultValue;
    
    // Track flag evaluation
    trackFeatureFlag(flagName, result, { default_used: flagValue === undefined });
    
    return result;
  };

  // Helper function to get string feature flag
  const getStringFlag = (flagName: string, defaultValue: string = ''): string => {
    const flagValue = featureFlags[flagName];
    const result = typeof flagValue === 'string' ? flagValue : defaultValue;
    
    // Track flag evaluation
    trackFeatureFlag(flagName, result, { default_used: flagValue === undefined });
    
    return result;
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
    ui,
    admin,
    education,
    trading,
    experimental,
  };
}
