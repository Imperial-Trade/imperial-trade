import { useCallback } from 'react';

export type HapticType = 'light' | 'medium' | 'heavy' | 'selection' | 'impact' | 'notification';

interface HapticPattern {
  duration?: number;
  intensity?: number;
}

export function useHapticFeedback() {
  const triggerHaptic = useCallback((type: HapticType = 'light', pattern?: HapticPattern) => {
    // Check if the device supports haptic feedback
    if (!('navigator' in window) || !navigator.vibrate) {
      return;
    }

    // Check if user is on iOS (which has different haptic API)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (isIOS && 'DeviceMotionEvent' in window) {
      // iOS Haptic Feedback (requires user gesture)
      try {
        // Modern iOS devices with Taptic Engine
        if ('vibrate' in navigator) {
          switch (type) {
            case 'light':
              navigator.vibrate(10);
              break;
            case 'medium':
              navigator.vibrate(20);
              break;
            case 'heavy':
              navigator.vibrate(50);
              break;
            case 'selection':
              navigator.vibrate(5);
              break;
            case 'impact':
              navigator.vibrate([10, 50, 10]);
              break;
            case 'notification':
              navigator.vibrate([50, 25, 50]);
              break;
          }
        }
      } catch (error) {
        // Silently fail if haptic feedback is not available
        console.debug('Haptic feedback not available:', error);
      }
    } else {
      // Android and other devices
      try {
        switch (type) {
          case 'light':
            navigator.vibrate(pattern?.duration || 25);
            break;
          case 'medium':
            navigator.vibrate(pattern?.duration || 50);
            break;
          case 'heavy':
            navigator.vibrate(pattern?.duration || 100);
            break;
          case 'selection':
            navigator.vibrate(pattern?.duration || 10);
            break;
          case 'impact':
            navigator.vibrate([50, 30, 50]);
            break;
          case 'notification':
            navigator.vibrate([100, 50, 100, 50, 100]);
            break;
        }
      } catch (error) {
        // Silently fail if vibration is not supported
        console.debug('Vibration not supported:', error);
      }
    }
  }, []);

  const triggerSuccess = useCallback(() => {
    triggerHaptic('notification');
  }, [triggerHaptic]);

  const triggerError = useCallback(() => {
    triggerHaptic('heavy');
  }, [triggerHaptic]);

  const triggerWarning = useCallback(() => {
    triggerHaptic('medium');
  }, [triggerHaptic]);

  const triggerSelection = useCallback(() => {
    triggerHaptic('selection');
  }, [triggerHaptic]);

  return {
    triggerHaptic,
    triggerSuccess,
    triggerError,
    triggerWarning,
    triggerSelection,
    isAvailable: 'vibrate' in navigator
  };
}