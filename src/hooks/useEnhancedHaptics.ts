// Enhanced Haptic Feedback Hook for iOS & Android
// Provides native-like haptic feedback with platform-specific optimizations

import { useCallback } from 'react';
import { getMobileDeviceInfo } from '@/utils/mobileDetection';

export type EnhancedHapticType = 
  | 'light' 
  | 'medium' 
  | 'heavy' 
  | 'selection' 
  | 'impact' 
  | 'notification'
  | 'success'
  | 'warning' 
  | 'error'
  | 'rigid'
  | 'soft';

export interface HapticPattern {
  pattern?: number[];
  duration?: number;
  intensity?: number;
}

export function useEnhancedHaptics() {
  const deviceInfo = getMobileDeviceInfo();

  const triggerHaptic = useCallback((
    type: EnhancedHapticType = 'light', 
    pattern?: HapticPattern
  ) => {
    if (!deviceInfo.supportsHaptics) return;

    try {
      if (deviceInfo.isIOS) {
        triggerIOSHaptic(type, pattern);
      } else if (deviceInfo.isAndroid) {
        triggerAndroidHaptic(type, pattern);
      }
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }, [deviceInfo]);

  const triggerIOSHaptic = (type: EnhancedHapticType, pattern?: HapticPattern) => {
    const generator = (window as any).DeviceMotionEvent;
    
    if ('Haptics' in window) {
      // Use iOS Haptics API if available
      const haptics = (window as any).Haptics;
      
      switch (type) {
        case 'light':
        case 'selection':
          haptics.selectionChanged();
          break;
        case 'medium':
        case 'impact':
          haptics.impactOccurred('medium');
          break;
        case 'heavy':
        case 'rigid':
          haptics.impactOccurred('heavy');
          break;
        case 'soft':
          haptics.impactOccurred('light');
          break;
        case 'success':
          haptics.notificationOccurred('success');
          break;
        case 'warning':
          haptics.notificationOccurred('warning');
          break;
        case 'error':
          haptics.notificationOccurred('error');
          break;
        default:
          haptics.impactOccurred('medium');
      }
    } else if (navigator.vibrate) {
      // Fallback to vibration API with iOS-appropriate patterns
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30],
        selection: [5],
        impact: [15],
        success: [10, 50, 10],
        warning: [20, 100, 20],
        error: [50, 50, 50],
        rigid: [40],
        soft: [8]
      };
      
      const vibrationPattern = pattern?.pattern || patterns[type] || [15];
      navigator.vibrate(vibrationPattern);
    }
  };

  const triggerAndroidHaptic = (type: EnhancedHapticType, pattern?: HapticPattern) => {
    if (!navigator.vibrate) return;

    // Android-optimized haptic patterns
    const androidPatterns = {
      light: [50],
      medium: [100],
      heavy: [200],
      selection: [30],
      impact: [80],
      success: [50, 50, 50],
      warning: [100, 100, 100, 100],
      error: [200, 100, 200, 100, 200],
      rigid: [150],
      soft: [40],
      notification: [0, 200, 100, 200]
    };

    const vibrationPattern = pattern?.pattern || androidPatterns[type] || [100];
    
    // Apply intensity if supported (Android 8.0+)
    if (pattern?.intensity && 'vibrate' in navigator) {
      try {
        (navigator as any).vibrate({
          pattern: vibrationPattern,
          intensity: Math.min(Math.max(pattern.intensity, 0), 255)
        });
      } catch {
        navigator.vibrate(vibrationPattern);
      }
    } else {
      navigator.vibrate(vibrationPattern);
    }
  };

  // Convenience methods for common actions
  const triggerSuccess = useCallback(() => triggerHaptic('success'), [triggerHaptic]);
  const triggerError = useCallback(() => triggerHaptic('error'), [triggerHaptic]);
  const triggerWarning = useCallback(() => triggerHaptic('warning'), [triggerHaptic]);
  const triggerSelection = useCallback(() => triggerHaptic('selection'), [triggerHaptic]);
  const triggerImpact = useCallback((intensity: 'light' | 'medium' | 'heavy' = 'medium') => 
    triggerHaptic(intensity), [triggerHaptic]);

  // Trading-specific haptic feedback
  const triggerTradeExecuted = useCallback(() => triggerHaptic('success'), [triggerHaptic]);
  const triggerPriceAlert = useCallback(() => triggerHaptic('notification'), [triggerHaptic]);
  const triggerStopLoss = useCallback(() => triggerHaptic('error'), [triggerHaptic]);
  const triggerTakeProfit = useCallback(() => triggerHaptic('success'), [triggerHaptic]);
  const triggerButtonPress = useCallback(() => triggerHaptic('light'), [triggerHaptic]);
  const triggerSwipeAction = useCallback(() => triggerHaptic('selection'), [triggerHaptic]);

  return {
    triggerHaptic,
    triggerSuccess,
    triggerError,
    triggerWarning,
    triggerSelection,
    triggerImpact,
    triggerTradeExecuted,
    triggerPriceAlert,
    triggerStopLoss,
    triggerTakeProfit,
    triggerButtonPress,
    triggerSwipeAction,
    isAvailable: deviceInfo.supportsHaptics,
    deviceInfo
  };
}