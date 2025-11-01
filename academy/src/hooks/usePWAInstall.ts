import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAInstallState {
  isInstallable: boolean;
  isInstalled: boolean;
  isStandalone: boolean;
  platform: 'android' | 'ios' | 'desktop' | 'unknown';
  canShowPrompt: boolean;
}

export const usePWAInstall = () => {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installState, setInstallState] = useState<PWAInstallState>({
    isInstallable: false,
    isInstalled: false,
    isStandalone: false,
    platform: 'unknown',
    canShowPrompt: false
  });

  // Detect platform
  const detectPlatform = useCallback((): PWAInstallState['platform'] => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/android/.test(userAgent)) return 'android';
    if (/iphone|ipad|ipod/.test(userAgent)) return 'ios';
    return 'desktop';
  }, []);

  // Check if running in standalone mode (already installed)
  const checkStandaloneMode = useCallback((): boolean => {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')
    );
  }, []);

  // Show install prompt
  const showInstallPrompt = useCallback(async () => {
    if (!installPrompt) {
      console.log('Trade Imperial PWA: No install prompt available');
      return false;
    }

    try {
      console.log('Trade Imperial PWA: Showing install prompt');
      await installPrompt.prompt();
      
      const choiceResult = await installPrompt.userChoice;
      console.log('Trade Imperial PWA: User choice:', choiceResult.outcome);
      
      if (choiceResult.outcome === 'accepted') {
        setInstallPrompt(null);
        setInstallState(prev => ({
          ...prev,
          isInstallable: false,
          canShowPrompt: false
        }));
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Trade Imperial PWA: Error showing install prompt:', error);
      return false;
    }
  }, [installPrompt]);

  // Check if PWA can be installed
  const checkInstallability = useCallback(() => {
    const platform = detectPlatform();
    const isStandalone = checkStandaloneMode();
    const isInstalled = isStandalone || localStorage.getItem('pwa-installed') === 'true';

    setInstallState(prev => ({
      ...prev,
      platform,
      isStandalone,
      isInstalled,
      isInstallable: !isInstalled && (!!installPrompt || platform === 'ios'),
      canShowPrompt: !isInstalled && !!installPrompt
    }));
  }, [installPrompt, detectPlatform, checkStandaloneMode]);

  useEffect(() => {
    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('Trade Imperial PWA: Install prompt available');
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log('Trade Imperial PWA: App installed successfully');
      localStorage.setItem('pwa-installed', 'true');
      setInstallPrompt(null);
      setInstallState(prev => ({
        ...prev,
        isInstalled: true,
        isInstallable: false,
        canShowPrompt: false
      }));
    };

    // Add event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Initial check
    checkInstallability();

    // Check for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = () => {
      checkInstallability();
    };
    
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleDisplayModeChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleDisplayModeChange);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleDisplayModeChange);
      } else {
        mediaQuery.removeListener(handleDisplayModeChange);
      }
    };
  }, [checkInstallability]);

  // Get iOS install instructions
  const getIOSInstructions = useCallback(() => {
    return {
      title: 'Install Trade Imperial',
      steps: [
        'Tap the Share button at the bottom of your screen',
        'Scroll down and tap "Add to Home Screen"',
        'Tap "Add" to install Trade Imperial'
      ]
    };
  }, []);

  return {
    ...installState,
    showInstallPrompt,
    getIOSInstructions,
    // Utility methods
    dismissPrompt: useCallback(() => {
      setInstallPrompt(null);
      setInstallState(prev => ({ ...prev, canShowPrompt: false }));
    }, []),
    
    // Check if user has dismissed install prompt before
    hasUserDismissed: useCallback(() => {
      return localStorage.getItem('pwa-install-dismissed') === 'true';
    }, []),
    
    // Mark install prompt as dismissed
    markDismissed: useCallback(() => {
      localStorage.setItem('pwa-install-dismissed', 'true');
    }, [])
  };
};