// Mobile Platform Detector Component
// Provides platform-specific optimizations and UI adjustments

import React, { useEffect, useState } from 'react';
import { getMobileDeviceInfo, type MobileDeviceInfo } from '@/utils/mobileDetection';

interface MobilePlatformDetectorProps {
  children: React.ReactNode;
}

export const MobilePlatformDetector: React.FC<MobilePlatformDetectorProps> = ({ children }) => {
  const [deviceInfo, setDeviceInfo] = useState<MobileDeviceInfo | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const info = getMobileDeviceInfo();
    setDeviceInfo(info);
    
    // Apply platform-specific optimizations
    const root = document.documentElement;
    
    // Clear existing platform classes
    root.classList.remove(
      'platform-ios', 'platform-android', 'has-notch', 
      'has-dynamic-island', 'pwa-mode', 'high-refresh-rate'
    );
    
    // Apply new platform classes
    if (info.isIOS) {
      root.classList.add('platform-ios');
      if (info.hasNotch) root.classList.add('has-notch');
      if (info.hasDynamicIsland) root.classList.add('has-dynamic-island');
    }
    
    if (info.isAndroid) {
      root.classList.add('platform-android');
    }
    
    if (info.isPWA) {
      root.classList.add('pwa-mode');
    }
    
    if (info.supports120Hz) {
      root.classList.add('high-refresh-rate');
    }
    
    // Set CSS custom properties for responsive design
    root.style.setProperty('--device-pixel-ratio', info.devicePixelRatio.toString());
    root.style.setProperty('--screen-width', `${info.screenWidth}px`);
    root.style.setProperty('--screen-height', `${info.screenHeight}px`);
    root.style.setProperty('--safe-area-inset-top', `${info.safeAreaInsets.top}px`);
    root.style.setProperty('--safe-area-inset-bottom', `${info.safeAreaInsets.bottom}px`);
    root.style.setProperty('--safe-area-inset-left', `${info.safeAreaInsets.left}px`);
    root.style.setProperty('--safe-area-inset-right', `${info.safeAreaInsets.right}px`);
    
    setIsReady(true);
  }, []);

  // Show loading state until platform detection is complete
  if (!isReady || !deviceInfo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div 
      className={`mobile-platform-wrapper ${deviceInfo.isIOS ? 'ios' : ''} ${deviceInfo.isAndroid ? 'android' : ''}`}
      data-platform={deviceInfo.isIOS ? 'ios' : deviceInfo.isAndroid ? 'android' : 'unknown'}
      data-pwa={deviceInfo.isPWA}
      data-standalone={deviceInfo.isStandalone}
      data-has-notch={deviceInfo.hasNotch}
      data-high-refresh={deviceInfo.supports120Hz}
    >
      {children}
    </div>
  );
};

// Platform-specific style additions for mobile.css
const platformStyles = `
/* iOS-specific optimizations */
.platform-ios {
  --mobile-header-blur: blur(20px);
  --mobile-transition: cubic-bezier(0.4, 0, 0.2, 1);
}

.platform-ios.has-notch {
  --mobile-safe-area-top: max(44px, env(safe-area-inset-top));
}

.platform-ios.has-dynamic-island {
  --mobile-safe-area-top: max(54px, env(safe-area-inset-top));
}

/* Android-specific optimizations */
.platform-android {
  --mobile-header-blur: blur(16px);
  --mobile-transition: cubic-bezier(0.4, 0, 0.6, 1);
}

/* PWA-specific styles */
.pwa-mode {
  --mobile-header-height: calc(var(--mobile-safe-area-top) + 56px);
}

/* High refresh rate optimizations */
.high-refresh-rate * {
  animation-duration: 0.15s;
  transition-duration: 0.15s;
}

/* Platform-specific button styles */
.platform-ios .mobile-button {
  border-radius: 12px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.platform-android .mobile-button {
  border-radius: 8px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.6, 1);
}

/* Platform-specific input styles */
.platform-ios .mobile-input {
  border-radius: 12px;
  padding: 12px 16px;
}

.platform-android .mobile-input {
  border-radius: 8px;
  padding: 14px 16px;
}
`;

// Inject platform styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = platformStyles;
  document.head.appendChild(styleElement);
}