import { useState, useEffect, useCallback } from 'react';
import { detectBrowser } from '@/utils/browserDetection';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAInstallationState {
  isInstallable: boolean;
  isInstalled: boolean;
  isIOSDevice: boolean;
  isStandalone: boolean;
  canInstall: boolean;
  showIOSInstructions: boolean;
  browserInfo: ReturnType<typeof detectBrowser>;
}

export function usePWAInstallation() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [state, setState] = useState<PWAInstallationState>({
    isInstallable: false,
    isInstalled: false,
    isIOSDevice: false,
    isStandalone: false,
    canInstall: false,
    showIOSInstructions: false,
    browserInfo: detectBrowser()
  });

  // Enhanced PWA installation detection
  const checkIfInstalled = useCallback(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                        (window.navigator as any).standalone === true ||
                        document.referrer.includes('android-app://');
    
    return isStandalone;
  }, []);

  // Check if device is iOS
  const checkIfIOS = useCallback(() => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }, []);

  // Enhanced Safari PWA detection
  const checkIfSafariPWA = useCallback(() => {
    const isIOSDevice = checkIfIOS();
    const isStandalone = checkIfInstalled();
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    
    return isIOSDevice && isStandalone && isSafari;
  }, [checkIfIOS, checkIfInstalled]);

  // Check if iOS version supports Web Push (16.4+)
  const checkIOSWebPushSupport = useCallback(() => {
    const userAgent = navigator.userAgent;
    const isIOS = checkIfIOS();
    
    if (!isIOS) return false;
    
    // Extract iOS version
    const match = userAgent.match(/OS (\d+)_(\d+)/);
    if (!match) return false;
    
    const majorVersion = parseInt(match[1]);
    const minorVersion = parseInt(match[2]);
    
    // iOS 16.4+ supports Web Push
    return majorVersion > 16 || (majorVersion === 16 && minorVersion >= 4);
  }, [checkIfIOS]);

  // Get iOS web push support status
  const getIOSWebPushSupport = useCallback(() => {
    return checkIOSWebPushSupport();
  }, [checkIOSWebPushSupport]);

  // Initialize PWA state
  useEffect(() => {
    const browserInfo = detectBrowser();
    const isIOSDevice = checkIfIOS();
    const isStandalone = checkIfInstalled();
    const isInstalled = isStandalone;
    const supportsWebPush = checkIOSWebPushSupport();
    
    setState(prev => ({
      ...prev,
      browserInfo,
      isIOSDevice,
      isStandalone,
      isInstalled,
      canInstall: !isInstalled && (installPrompt !== null || isIOSDevice),
      showIOSInstructions: isIOSDevice && !isInstalled,
      isInstallable: installPrompt !== null
    }));
  }, [installPrompt, checkIfInstalled, checkIfIOS, checkIOSWebPushSupport]);

  // Listen for beforeinstallprompt event (Android/Chrome)
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setState(prev => ({
        ...prev,
        isInstalled: true,
        isStandalone: true,
        canInstall: false,
        isInstallable: false
      }));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Install PWA (Android/Chrome)
  const installPWA = useCallback(async () => {
    if (!installPrompt) return false;
    
    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setInstallPrompt(null);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error installing PWA:', error);
      return false;
    }
  }, [installPrompt]);

  // Get iOS installation instructions
  const getIOSInstructions = useCallback(() => {
    if (!state.isIOSDevice) return [];
    
    return [
      'Tap the Share button at the bottom of Safari',
      'Scroll down and tap "Add to Home Screen"',
      'Tap "Add" in the top-right corner',
      'Open the app from your home screen',
      'Enable notifications when prompted'
    ];
  }, [state.isIOSDevice]);

  // Check if user dismissed iOS instructions
  const dismissIOSInstructions = useCallback(() => {
    localStorage.setItem('ios_install_dismissed', 'true');
    setState(prev => ({
      ...prev,
      showIOSInstructions: false
    }));
  }, []);

  // Check if iOS instructions were dismissed (removed - always show instructions when needed)

  return {
    ...state,
    installPWA,
    getIOSInstructions,
    getIOSWebPushSupport,
    dismissIOSInstructions,
    hasInstallPrompt: installPrompt !== null,
    isSafariPWA: checkIfSafariPWA()
  };
}