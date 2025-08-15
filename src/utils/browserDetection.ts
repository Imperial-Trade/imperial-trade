// Browser detection utilities for OneSignal compatibility
export interface BrowserInfo {
  name: string;
  version: string;
  isSupported: boolean;
  isMobile: boolean;
  requiresSpecialHandling: boolean;
  isIOS: boolean;
  isIOSWebPushSupported: boolean;
  isPWACapable: boolean;
  isStandalone: boolean;
  isInAppBrowser: boolean;
}

export function detectBrowser(): BrowserInfo {
  const userAgent = navigator.userAgent;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  
  // iOS detection
  const isIOS = /iPad|iPhone|iPod/.test(userAgent) || 
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  
  // iOS Web Push support (iOS 16.4+)
  const getIOSVersion = () => {
    const match = userAgent.match(/OS (\d+)_(\d+)/);
    if (!match) return { major: 0, minor: 0 };
    return { major: parseInt(match[1]), minor: parseInt(match[2]) };
  };
  
  const iosVersion = getIOSVersion();
  const isIOSWebPushSupported = isIOS && 
    (iosVersion.major > 16 || (iosVersion.major === 16 && iosVersion.minor >= 4));
  
  // PWA detection
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                      (window.navigator as any).standalone === true ||
                      document.referrer.includes('android-app://');
  
  // In-app browser detection
  const isInAppBrowser = /FBAN|FBAV|Instagram|Twitter|LinkedIn|WhatsApp|Snapchat|TikTok/.test(userAgent);
  
  // PWA capability
  const isPWACapable = 'serviceWorker' in navigator && 
                       'PushManager' in window && 
                       'Notification' in window;
  
  // Enhanced Safari detection for iOS PWA compatibility
  const isSafari = (() => {
    // Standard Safari detection
    if (/^((?!chrome|android).)*safari/i.test(userAgent)) return true;
    
    // iOS PWA Safari detection - these user agents don't always include "safari"
    if (isIOS && (/Version\/[\d.]+.*Mobile.*Safari/i.test(userAgent) || 
                  /iPhone.*Version\/[\d.]+/i.test(userAgent) ||
                  /iPad.*Version\/[\d.]+/i.test(userAgent))) {
      return true;
    }
    
    // iOS PWA in standalone mode (may have different user agent)
    if (isIOS && isStandalone && !(/Chrome|CriOS|FxiOS|EdgiOS/.test(userAgent))) {
      return true;
    }
    
    return false;
  })();
  
  if (isSafari) {
    const version = userAgent.match(/Version\/(\d+)/)?.[1] || '16'; // Default to 16 for iOS PWA
    const safariVersion = parseInt(version);
    
    // For iOS PWA, we're more permissive with support detection
    const iosSupported = isIOS ? isIOSWebPushSupported : false;
    const desktopSupported = !isIOS && safariVersion >= 16;
    
    console.log(`[BrowserDetection] Safari detected - iOS: ${isIOS}, Standalone: ${isStandalone}, Version: ${version}, WebPush: ${isIOSWebPushSupported}, Supported: ${iosSupported || desktopSupported}`);
    
    return {
      name: 'Safari',
      version,
      isSupported: iosSupported || desktopSupported,
      isMobile: isMobile,
      requiresSpecialHandling: true,
      isIOS,
      isIOSWebPushSupported,
      isPWACapable,
      isStandalone,
      isInAppBrowser
    };
  }
  
  // Chrome detection
  if (/Chrome/.test(userAgent) && !/Edg/.test(userAgent)) {
    const version = userAgent.match(/Chrome\/(\d+)/)?.[1] || '0';
    return {
      name: 'Chrome',
      version,
      isSupported: parseInt(version) >= 50,
      isMobile: isMobile,
      requiresSpecialHandling: false,
      isIOS,
      isIOSWebPushSupported,
      isPWACapable,
      isStandalone,
      isInAppBrowser
    };
  }
  
  // Edge detection
  if (/Edg/.test(userAgent)) {
    const version = userAgent.match(/Edg\/(\d+)/)?.[1] || '0';
    return {
      name: 'Edge',
      version,
      isSupported: parseInt(version) >= 79,
      isMobile: isMobile,
      requiresSpecialHandling: false,
      isIOS,
      isIOSWebPushSupported,
      isPWACapable,
      isStandalone,
      isInAppBrowser
    };
  }
  
  // Firefox detection
  if (/Firefox/.test(userAgent)) {
    const version = userAgent.match(/Firefox\/(\d+)/)?.[1] || '0';
    return {
      name: 'Firefox',
      version,
      isSupported: parseInt(version) >= 44,
      isMobile: isMobile,
      requiresSpecialHandling: true, // Firefox needs longer timeouts
      isIOS,
      isIOSWebPushSupported,
      isPWACapable,
      isStandalone,
      isInAppBrowser
    };
  }
  
  // Default for other browsers
  return {
    name: 'Unknown',
    version: '0',
    isSupported: false,
    isMobile: isMobile,
    requiresSpecialHandling: true,
    isIOS,
    isIOSWebPushSupported,
    isPWACapable,
    isStandalone,
    isInAppBrowser
  };
}

export function getBrowserSpecificConfig(browserInfo: BrowserInfo) {
  const baseConfig = {
    subscriptionTimeout: 10000,
    permissionTimeout: 8000,
    retryDelay: 2000,
    maxRetries: 3
  };
  
  switch (browserInfo.name) {
    case 'Safari':
      return {
        ...baseConfig,
        subscriptionTimeout: 15000,
        permissionTimeout: 12000,
        retryDelay: 3000,
        maxRetries: 2,
        needsSafariWebPush: true
      };
    
    case 'Firefox':
      return {
        ...baseConfig,
        subscriptionTimeout: 12000,
        permissionTimeout: 10000,
        retryDelay: 2500,
        maxRetries: 3
      };
    
    case 'Chrome':
    case 'Edge':
      return baseConfig;
    
    default:
      return {
        ...baseConfig,
        subscriptionTimeout: 15000,
        permissionTimeout: 12000,
        retryDelay: 3000,
        maxRetries: 2
      };
  }
}

export function getBrowserInstructions(browserInfo: BrowserInfo): string {
  if (browserInfo.isIOS && !browserInfo.isStandalone) {
    return 'For iPhone: Install the app by tapping Share → Add to Home Screen, then open the app to enable notifications';
  }
  
  if (browserInfo.isInAppBrowser) {
    return 'Open this page in your default browser (Safari/Chrome) to enable notifications';
  }
  
  switch (browserInfo.name) {
    case 'Safari':
      if (browserInfo.isIOS) {
        return browserInfo.isIOSWebPushSupported 
          ? 'Install the app first, then enable notifications when prompted'
          : 'iOS version 16.4+ required for push notifications';
      }
      return 'For Safari: Go to Settings → Notifications → Allow notifications from this website';
    
    case 'Firefox':
      return 'For Firefox: Click the shield icon in the address bar → Allow notifications';
    
    case 'Chrome':
      return 'For Chrome: Click the lock icon → Site settings → Notifications → Allow';
    
    case 'Edge':
      return 'For Edge: Click the lock icon → Site permissions → Notifications → Allow';
    
    default:
      return 'Please check your browser settings to allow notifications from this site';
  }
}