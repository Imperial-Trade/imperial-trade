/**
 * Enhanced Safari PWA Detection Utilities
 */

export interface SafariPWAInfo {
  isSafariPWA: boolean;
  isStandalone: boolean;
  isIOS: boolean;
  isSafari: boolean;
  hasWebPushSupport: boolean;
  userAgent: string;
}

/**
 * Comprehensive Safari PWA detection
 */
export function detectSafariPWA(): SafariPWAInfo {
  if (typeof window === 'undefined') {
    return {
      isSafariPWA: false,
      isStandalone: false,
      isIOS: false,
      isSafari: false,
      hasWebPushSupport: false,
      userAgent: ''
    };
  }

  const userAgent = navigator.userAgent;
  
  // Detect iOS
  const isIOS = /iPad|iPhone|iPod/.test(userAgent) || 
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  
  // Detect Safari (not Chrome or other browsers)
  const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent) && !/CriOS/.test(userAgent);
  
  // **Enhanced standalone mode (PWA) detection for Safari**
  const isStandalone = (() => {
    // Standard PWA display mode detection
    if (window.matchMedia('(display-mode: standalone)').matches) return true;
    
    // iOS Safari specific standalone detection
    if ((window.navigator as any).standalone === true) return true;
    
    // Additional iOS Safari PWA verification
    if (isIOS && isSafari) {
      // Check viewport dimensions to detect Safari PWA mode
      const heightRatio = window.screen.height / window.innerHeight;
      // In Safari PWA, the height ratio should be close to 1 (no browser UI)
      if (heightRatio < 1.15) return true;
      
      // Check if status bar is hidden (Safari PWA indicator)
      if ((window.navigator as any).standalone !== false && !document.referrer) return true;
    }
    
    return false;
  })();
  
  // Safari PWA is iOS + Safari + standalone
  const isSafariPWA = isIOS && isSafari && isStandalone;
  
  // Check iOS web push support (16.4+)
  let hasWebPushSupport = false;
  if (isIOS) {
    const match = userAgent.match(/OS (\d+)_(\d+)/);
    if (match) {
      const majorVersion = parseInt(match[1]);
      const minorVersion = parseInt(match[2]);
      hasWebPushSupport = majorVersion > 16 || (majorVersion === 16 && minorVersion >= 4);
    }
  }
  
  return {
    isSafariPWA,
    isStandalone,
    isIOS,
    isSafari,
    hasWebPushSupport,
    userAgent
  };
}

/**
 * Get Safari PWA specific permission handling instructions
 */
export function getSafariPWAPermissionFlow(): {
  requiresNativePrompt: boolean;
  instructionText: string;
  buttonText: string;
} {
  const { isSafariPWA, hasWebPushSupport } = detectSafariPWA();
  
  if (isSafariPWA) {
    return {
      requiresNativePrompt: false,
      instructionText: hasWebPushSupport 
        ? 'Enable notifications to receive real-time trading signals.'
        : 'Your iOS version doesn\'t support push notifications in PWAs.',
      buttonText: hasWebPushSupport ? 'Subscribe' : 'Update iOS'
    };
  }
  
  return {
    requiresNativePrompt: true,
    instructionText: 'Enable browser notifications to receive alerts.',
    buttonText: 'Enable Now'
  };
}