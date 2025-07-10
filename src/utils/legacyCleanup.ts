
// Utility to track legacy components that should be removed
// This helps identify components that are no longer needed after optimization

export const LEGACY_COMPONENTS = {
  // Old form components replaced by optimized versions
  EnhancedNewAlertForm: {
    replacement: 'OptimizedNewAlertForm',
    reason: 'HTTP-based live pricing causes lag',
    status: 'deprecated'
  },
  
  // Old hooks replaced by optimized versions
  useLivePrice: {
    replacement: 'useOptimizedLivePrice',
    reason: 'Uses HTTP API calls instead of WebSocket',
    status: 'deprecated'
  },
  
  useEnhancedLivePrice: {
    replacement: 'useOptimizedLivePrice', 
    reason: 'Uses HTTP API calls with poor error handling',
    status: 'deprecated'
  }
} as const;

export function logLegacyUsage(componentName: keyof typeof LEGACY_COMPONENTS) {
  const info = LEGACY_COMPONENTS[componentName];
  console.warn(
    `🚨 Legacy component "${componentName}" is being used.\n` +
    `Reason for deprecation: ${info.reason}\n` +
    `Please use "${info.replacement}" instead for better performance.`
  );
}

// Helper to check if a component should be migrated
export function shouldMigrate(componentName: string): boolean {
  return componentName in LEGACY_COMPONENTS;
}
