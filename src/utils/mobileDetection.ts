// Enhanced Mobile Detection & Platform Optimization
// Provides detailed device and platform information for native-like experience

export interface MobileDeviceInfo {
  isIOS: boolean;
  isAndroid: boolean;
  isSafari: boolean;
  isChrome: boolean;
  isWebKit: boolean;
  isPWA: boolean;
  isStandalone: boolean;
  hasNotch: boolean;
  hasDynamicIsland: boolean;
  supportsHaptics: boolean;
  supports120Hz: boolean;
  devicePixelRatio: number;
  screenWidth: number;
  screenHeight: number;
  safeAreaInsets: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

export function getMobileDeviceInfo(): MobileDeviceInfo {
  const userAgent = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(userAgent);
  const isAndroid = /android/.test(userAgent);
  const isSafari = /safari/.test(userAgent) && !/chrome/.test(userAgent);
  const isChrome = /chrome/.test(userAgent);
  const isWebKit = /webkit/.test(userAgent);
  
  // PWA detection
  const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                window.matchMedia('(display-mode: fullscreen)').matches ||
                (window.navigator as any).standalone === true;
  
  const isStandalone = (window.navigator as any).standalone === true;
  
  // Device-specific detection
  const hasNotch = isIOS && (
    window.screen.height === 812 || // iPhone X, XS, 11 Pro
    window.screen.height === 896 || // iPhone XR, XS Max, 11, 11 Pro Max
    window.screen.height === 844 || // iPhone 12, 12 Pro, 13, 13 Pro
    window.screen.height === 926 || // iPhone 12 Pro Max, 13 Pro Max
    window.screen.height === 852 || // iPhone 14, 14 Pro
    window.screen.height === 932    // iPhone 14 Pro Max
  );
  
  const hasDynamicIsland = isIOS && (
    window.screen.height === 852 || // iPhone 14 Pro
    window.screen.height === 932    // iPhone 14 Pro Max
  );
  
  // Capabilities detection
  const supportsHaptics = isIOS || (isAndroid && 'vibrate' in navigator);
  const supports120Hz = window.screen && (window.screen as any).refreshRate >= 120;
  
  // Safe area calculation
  const computedStyle = getComputedStyle(document.documentElement);
  const safeAreaInsets = {
    top: parseInt(computedStyle.getPropertyValue('--mobile-safe-area-top')) || 0,
    bottom: parseInt(computedStyle.getPropertyValue('--mobile-safe-area-bottom')) || 0,
    left: parseInt(computedStyle.getPropertyValue('--mobile-safe-area-left')) || 0,
    right: parseInt(computedStyle.getPropertyValue('--mobile-safe-area-right')) || 0,
  };
  
  return {
    isIOS,
    isAndroid,
    isSafari,
    isChrome,
    isWebKit,
    isPWA,
    isStandalone,
    hasNotch,
    hasDynamicIsland,
    supportsHaptics,
    supports120Hz,
    devicePixelRatio: window.devicePixelRatio || 1,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    safeAreaInsets
  };
}

export function applyPlatformOptimizations() {
  const deviceInfo = getMobileDeviceInfo();
  const root = document.documentElement;
  
  // Apply platform-specific CSS classes
  if (deviceInfo.isIOS) {
    root.classList.add('platform-ios');
    if (deviceInfo.hasNotch) root.classList.add('has-notch');
    if (deviceInfo.hasDynamicIsland) root.classList.add('has-dynamic-island');
  }
  
  if (deviceInfo.isAndroid) {
    root.classList.add('platform-android');
  }
  
  if (deviceInfo.isPWA) {
    root.classList.add('pwa-mode');
  }
  
  if (deviceInfo.supports120Hz) {
    root.classList.add('high-refresh-rate');
  }
  
  // Set CSS custom properties
  root.style.setProperty('--device-pixel-ratio', deviceInfo.devicePixelRatio.toString());
  root.style.setProperty('--screen-width', `${deviceInfo.screenWidth}px`);
  root.style.setProperty('--screen-height', `${deviceInfo.screenHeight}px`);
  
  // Apply platform-specific meta tag adjustments
  if (deviceInfo.isIOS) {
    // iOS-specific viewport optimizations
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content', 
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover, shrink-to-fit=no'
      );
    }
    
    // Status bar styling for iOS
    let statusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (!statusBarMeta) {
      statusBarMeta = document.createElement('meta');
      statusBarMeta.setAttribute('name', 'apple-mobile-web-app-status-bar-style');
      document.head.appendChild(statusBarMeta);
    }
    statusBarMeta.setAttribute('content', 'black-translucent');
  }
  
  return deviceInfo;
}

export function optimizeForMobilePerformance() {
  // Reduce animations on lower-end devices
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) {
    document.documentElement.classList.add('reduced-motion');
  }
  
  // Optimize scrolling performance
  const smoothScrollElements = document.querySelectorAll('.smooth-scroll');
  smoothScrollElements.forEach(element => {
    (element as HTMLElement).style.scrollBehavior = 'smooth';
    (element as HTMLElement).style.willChange = 'scroll-position';
  });
  
  // Preload critical fonts
  const criticalFonts = [
    'Inter',
    'system-ui',
    '-apple-system',
    'BlinkMacSystemFont'
  ];
  
  criticalFonts.forEach(font => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'font';
    link.type = 'font/woff2';
    link.crossOrigin = 'anonymous';
    // Note: Would need actual font URLs in production
  });
}

// Platform-specific gesture handling
export function setupPlatformGestures() {
  const deviceInfo = getMobileDeviceInfo();
  
  if (deviceInfo.isIOS) {
    // iOS-specific gesture setup
    setupiOSGestures();
  } else if (deviceInfo.isAndroid) {
    // Android-specific gesture setup
    setupAndroidGestures();
  }
}

function setupiOSGestures() {
  // Prevent iOS elastic scroll where not wanted
  document.addEventListener('touchmove', (e) => {
    if (e.target instanceof Element && !e.target.closest('.allow-scroll')) {
      e.preventDefault();
    }
  }, { passive: false });
  
  // Handle iOS back gesture
  let touchStartX = 0;
  document.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
  });
  
  document.addEventListener('touchend', (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchEndX - touchStartX;
    
    // If swipe from left edge
    if (touchStartX < 20 && diff > 50) {
      // Trigger back navigation if appropriate
      if (window.history.length > 1) {
        window.history.back();
      }
    }
  });
}

function setupAndroidGestures() {
  // Android-specific gesture handling
  // Handle Android back button
  window.addEventListener('popstate', (e) => {
    // Custom back button handling
    e.preventDefault();
    // Implement custom navigation logic
  });
}