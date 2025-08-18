// Fallback hook - OneSignal removed
export function useOneSignalRecovery() {
  return {
    isRecovering: false,
    recoveryStage: 'idle' as const,
    playerId: null,
    subscriptionActive: false,
    lastError: null,
    recoveryAttempts: 0,
    needsRecovery: false,
    startRecovery: async () => ({
      success: false,
      error: 'Push notifications disabled'
    }),
    canRetry: false,
    resetRecovery: () => {}
  };
}