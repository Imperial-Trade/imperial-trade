/**
 * Enhanced Platform Detection for Cross-Platform Push Notifications
 * Addresses Phase 1: Platform Detection Enhancement
 */

export interface PlatformInfo {
  // Basic platform info
  platform: 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'unknown';
  browser: string;
  browserVersion: string;
  osVersion: string;
  
  // PWA capabilities
  isPWA: boolean;
  isPWAInstalled: boolean;
  isPWACapable: boolean;
  
  // Push notification support
  supportsNativePush: boolean;
  supportsWebPush: boolean;
  requiresPWAForPush: boolean;
  
  // Special handling flags
  isInAppBrowser: boolean;
  isPrivateBrowsing: boolean;
  hasNotificationQuirks: boolean;
  requiresSpecialFlow: boolean;
  
  // Delivery reliability indicators
  hasStableDelivery: boolean;
  needsSubscriptionRefresh: boolean;
  
  // Platform-specific identifiers
  platformSpecific: {
    isIOSSafariPWA: boolean;
    isAndroidChromeHome: boolean;
    isWindowsPWA: boolean;
    isSamsungInternetPWA: boolean;
    isEdgeMobilePWA: boolean;
  };
}

export function detectPlatform(): PlatformInfo {
  const ua = navigator.userAgent;
  const platform = navigator.platform;
  
  // Enhanced iOS detection with version parsing
  const isIOS = /iPad|iPhone|iPod/.test(ua) || 
                (platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  
  const getIOSVersion = (): string => {
    const match = ua.match(/OS (\d+)_(\d+)_?(\d+)?/);
    if (!match) return '0.0.0';
    return `${match[1]}.${match[2]}.${match[3] || '0'}`;
  };
  
  const iosVersion = getIOSVersion();
  const iosMajor = parseInt(iosVersion.split('.')[0]);
  const iosMinor = parseInt(iosVersion.split('.')[1]);
  
  // Enhanced Android detection
  const isAndroid = /Android/.test(ua);
  const getAndroidVersion = (): string => {
    const match = ua.match(/Android (\d+)\.(\d+)\.?(\d+)?/);
    if (!match) return '0.0.0';
    return `${match[1]}.${match[2]}.${match[3] || '0'}`;
  };
  
  // Enhanced Windows detection
  const isWindows = /Windows/.test(ua);
  const isMacOS = /Mac OS X/.test(ua);
  const isLinux = /Linux/.test(ua) && !isAndroid;
  
  // Enhanced browser detection
  const browserDetection = () => {
    if (/Edg\//.test(ua)) {
      const version = ua.match(/Edg\/(\d+)/)?.[1] || '0';
      return { name: 'Edge', version };
    }
    if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) {
      const version = ua.match(/Chrome\/(\d+)/)?.[1] || '0';
      return { name: 'Chrome', version };
    }
    if (/Safari\//.test(ua) && !/Chrome/.test(ua)) {
      const version = ua.match(/Version\/(\d+)/)?.[1] || '0';
      return { name: 'Safari', version };
    }
    if (/Firefox\//.test(ua)) {
      const version = ua.match(/Firefox\/(\d+)/)?.[1] || '0';
      return { name: 'Firefox', version };
    }
    if (/SamsungBrowser\//.test(ua)) {
      const version = ua.match(/SamsungBrowser\/(\d+)/)?.[1] || '0';
      return { name: 'Samsung Internet', version };
    }
    return { name: 'Unknown', version: '0' };
  };
  
  const { name: browser, version: browserVersion } = browserDetection();
  
  // Enhanced PWA detection
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                      (window.navigator as any).standalone === true ||
                      document.referrer.includes('android-app://');
                      
  const isPWACapable = 'serviceWorker' in navigator && 
                       'PushManager' in window && 
                       'Notification' in window;
  
  // Enhanced in-app browser detection
  const isInAppBrowser = /FBAN|FBAV|Instagram|Twitter|LinkedIn|WhatsApp|Snapchat|TikTok|Line|Telegram|WeChat|QQ|MiuiBrowser/.test(ua);
  
  // Private browsing detection
  const isPrivateBrowsing = (() => {
    try {
      // Chrome/Safari private browsing detection
      if ('webkitRequestFileSystem' in window) {
        return false; // Not private
      }
      return !('localStorage' in window) || !window.localStorage;
    } catch {
      return true; // Likely private
    }
  })();
  
  // Platform-specific PWA detection
  const platformSpecific = {
    isIOSSafariPWA: isIOS && browser === 'Safari' && isStandalone,
    isAndroidChromeHome: isAndroid && browser === 'Chrome' && isStandalone,
    isWindowsPWA: isWindows && (browser === 'Edge' || browser === 'Chrome') && isStandalone,
    isSamsungInternetPWA: isAndroid && browser === 'Samsung Internet' && isStandalone,
    isEdgeMobilePWA: (isAndroid || isIOS) && browser === 'Edge' && isStandalone
  };
  
  // Push notification support analysis
  const supportsWebPush = (() => {
    if (isInAppBrowser) return false;
    if (isPrivateBrowsing) return false;
    
    if (isIOS) {
      // iOS Web Push support in Safari 16.4+ and PWAs
      return (iosMajor > 16 || (iosMajor === 16 && iosMinor >= 4)) && 
             (browser === 'Safari' || platformSpecific.isIOSSafariPWA);
    }
    
    if (isAndroid) {
      return browser === 'Chrome' || browser === 'Edge' || browser === 'Samsung Internet';
    }
    
    if (isWindows || isMacOS || isLinux) {
      return browser === 'Chrome' || browser === 'Edge' || browser === 'Firefox';
    }
    
    return false;
  })();
  
  const supportsNativePush = isIOS || isAndroid;
  
  const requiresPWAForPush = (() => {
    if (isIOS && browser === 'Safari') {
      return iosMajor >= 16; // iOS Safari needs PWA for reliable push
    }
    return false;
  })();
  
  // Notification quirks detection
  const hasNotificationQuirks = (() => {
    if (isIOS) return true; // iOS has many push notification quirks
    if (browser === 'Samsung Internet') return true; // Samsung Internet has specific behaviors
    if (isInAppBrowser) return true; // In-app browsers have limitations
    return false;
  })();
  
  // Delivery reliability assessment
  const hasStableDelivery = (() => {
    if (isInAppBrowser) return false;
    if (isPrivateBrowsing) return false;
    if (isIOS && !platformSpecific.isIOSSafariPWA) return false;
    
    // Chrome on Android/Windows/macOS/Linux has excellent delivery
    if (browser === 'Chrome' && !isIOS) return true;
    
    // Edge on Windows has good delivery
    if (browser === 'Edge' && isWindows) return true;
    
    // Firefox has decent delivery
    if (browser === 'Firefox') return true;
    
    // Safari PWA on iOS has good delivery
    if (platformSpecific.isIOSSafariPWA) return true;
    
    return false;
  })();
  
  const needsSubscriptionRefresh = (() => {
    // Safari sometimes needs subscription refresh
    if (browser === 'Safari') return true;
    
    // Samsung Internet can have stale subscriptions
    if (browser === 'Samsung Internet') return true;
    
    return false;
  })();
  
  const requiresSpecialFlow = (() => {
    if (isInAppBrowser) return true; // Need to redirect to real browser
    if (isIOS && !platformSpecific.isIOSSafariPWA && requiresPWAForPush) return true; // Need PWA installation
    if (isPrivateBrowsing) return true; // Need regular browsing mode
    return false;
  })();
  
  // Determine platform
  let detectedPlatform: PlatformInfo['platform'] = 'unknown';
  if (isIOS) detectedPlatform = 'ios';
  else if (isAndroid) detectedPlatform = 'android';
  else if (isWindows) detectedPlatform = 'windows';
  else if (isMacOS) detectedPlatform = 'macos';
  else if (isLinux) detectedPlatform = 'linux';
  
  return {
    platform: detectedPlatform,
    browser,
    browserVersion,
    osVersion: isIOS ? iosVersion : isAndroid ? getAndroidVersion() : 'unknown',
    
    isPWA: isStandalone,
    isPWAInstalled: isStandalone,
    isPWACapable,
    
    supportsNativePush,
    supportsWebPush,
    requiresPWAForPush,
    
    isInAppBrowser,
    isPrivateBrowsing,
    hasNotificationQuirks,
    requiresSpecialFlow,
    
    hasStableDelivery,
    needsSubscriptionRefresh,
    
    platformSpecific
  };
}

/**
 * Get platform-specific configuration for push notifications
 */
export function getPlatformConfig(platformInfo: PlatformInfo) {
  const baseConfig = {
    subscriptionTimeout: 15000,
    permissionTimeout: 10000,
    retryDelay: 1000,
    maxRetries: 3,
    healthCheckInterval: 300000, // 5 minutes
  };
  
  // iOS-specific configuration
  if (platformInfo.platform === 'ios') {
    return {
      ...baseConfig,
      subscriptionTimeout: 20000, // iOS needs more time
      permissionTimeout: 15000,
      retryDelay: 2000,
      maxRetries: 2, // Fewer retries on iOS
      healthCheckInterval: 600000, // 10 minutes for iOS
      requiresUserGesture: true,
      needsPWAInstallation: platformInfo.requiresPWAForPush,
    };
  }
  
  // Android-specific configuration
  if (platformInfo.platform === 'android') {
    const config = {
      ...baseConfig,
      subscriptionTimeout: 12000,
      permissionTimeout: 8000,
      retryDelay: 800,
      maxRetries: 4,
      healthCheckInterval: 180000, // 3 minutes
    };
    
    // Samsung Internet needs special handling
    if (platformInfo.browser === 'Samsung Internet') {
      config.subscriptionTimeout = 18000;
      config.retryDelay = 1500;
      config.maxRetries = 2;
    }
    
    return config;
  }
  
  // Windows/macOS/Linux configuration
  return {
    ...baseConfig,
    subscriptionTimeout: 10000,
    permissionTimeout: 6000,
    retryDelay: 500,
    maxRetries: 5,
    healthCheckInterval: 120000, // 2 minutes
  };
}

/**
 * Get user-friendly platform instructions
 */
export function getPlatformInstructions(platformInfo: PlatformInfo): string {
  if (platformInfo.isInAppBrowser) {
    return "Please open this page in your default browser to enable notifications.";
  }
  
  if (platformInfo.isPrivateBrowsing) {
    return "Notifications are not available in private browsing mode. Please use regular browsing.";
  }
  
  if (!platformInfo.supportsWebPush) {
    return `Push notifications are not supported in ${platformInfo.browser} on ${platformInfo.platform}. Please use Chrome, Safari, or Edge.`;
  }
  
  if (platformInfo.platform === 'ios' && !platformInfo.isPWA && platformInfo.requiresPWAForPush) {
    return "For the best notification experience on iOS, please install this app to your home screen first.";
  }
  
  if (platformInfo.platform === 'android' && platformInfo.browser === 'Samsung Internet') {
    return "Make sure notifications are enabled in Samsung Internet settings and device notification settings.";
  }
  
  return "Click 'Allow' when prompted to enable push notifications.";
}