// Browser detection utilities for OneSignal compatibility
export interface BrowserInfo {
  name: string;
  version: string;
  isSupported: boolean;
  isMobile: boolean;
  requiresSpecialHandling: boolean;
}

export function detectBrowser(): BrowserInfo {
  const userAgent = navigator.userAgent;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  
  // Safari detection
  if (/^((?!chrome|android).)*safari/i.test(userAgent)) {
    const version = userAgent.match(/Version\/(\d+)/)?.[1] || '0';
    return {
      name: 'Safari',
      version,
      isSupported: parseInt(version) >= 16, // Safari 16+ supports Web Push
      isMobile: isMobile,
      requiresSpecialHandling: true
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
      requiresSpecialHandling: false
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
      requiresSpecialHandling: false
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
      requiresSpecialHandling: true // Firefox needs longer timeouts
    };
  }
  
  // Default for other browsers
  return {
    name: 'Unknown',
    version: '0',
    isSupported: false,
    isMobile: isMobile,
    requiresSpecialHandling: true
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
  switch (browserInfo.name) {
    case 'Safari':
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