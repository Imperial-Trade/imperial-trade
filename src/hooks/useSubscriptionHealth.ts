// Fallback hook - OneSignal removed
export function useSubscriptionHealth() {
  return {
    health: {
      status: 'error' as const,
      lastCheck: new Date(),
      lastSuccess: null,
      failureCount: 0,
      issues: ['Push notifications disabled - using in-app notifications'],
      needsRefresh: false,
      deliveryRate: 0
    },
    runHealthCheck: async () => {},
    attemptRecovery: async () => false,
    isChecking: false
  };
}