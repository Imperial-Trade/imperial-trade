// Fallback hooks to replace OneSignal functionality
import { useState, useCallback } from 'react';

// Fallback for useOneSignalEnhanced
export const useFallbackOneSignalEnhanced = () => {
  return {
    permission: 'denied' as const,
    isGranted: false,
    hasSubscription: false,
    initialized: true,
    isIframeBlocked: false,
    requestPermission: useCallback(async () => ({
      success: false,
      error: 'Push notifications disabled',
      details: 'Using in-app notifications instead',
      finalPermission: 'denied'
    }), []),
    browserInfo: { name: 'Unknown', version: 'N/A' },
    browserInstructions: 'Push notifications are disabled. In-app notifications are active.'
  };
};

// Fallback for useOneSignalRecovery
export const useFallbackOneSignalRecovery = () => {
  return {
    isRecovering: false,
    recoveryStage: 'idle' as const,
    playerId: null,
    subscriptionActive: false,
    lastError: null,
    recoveryAttempts: 0,
    needsRecovery: false,
    startRecovery: useCallback(async () => ({
      success: false,
      error: 'Push notifications disabled'
    }), []),
    canRetry: false,
    resetRecovery: useCallback(() => {}, [])
  };
};

// Fallback for useSubscriptionHealth
export const useFallbackSubscriptionHealth = () => {
  return {
    health: {
      status: 'error' as const,
      lastCheck: new Date(),
      lastSuccess: null,
      failureCount: 0,
      issues: ['Push notifications disabled'],
      needsRefresh: false,
      deliveryRate: 0
    },
    runHealthCheck: useCallback(async () => {}, []),
    attemptRecovery: useCallback(async () => false, []),
    isChecking: false
  };
};