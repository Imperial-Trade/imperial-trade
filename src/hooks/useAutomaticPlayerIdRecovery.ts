// Fallback hook - OneSignal removed
export function useAutomaticPlayerIdRecovery() {
  return {
    isRecovering: false,
    recoveryAttempts: 0,
    lastRecoveryTime: null,
    recoveryQueue: [],
    recoverPlayerId: () => Promise.resolve(false),
    clearQueue: () => {},
    getRecoveryStats: () => ({
      totalAttempts: 0,
      successRate: 0,
      avgRecoveryTime: 0,
      lastSuccessTime: null
    }),
    // Add missing properties
    recoveryStatus: 'idle' as const,
    recoveryAttempted: false
  };
}