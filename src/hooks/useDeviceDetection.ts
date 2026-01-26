
import { useState, useEffect } from 'react';

interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  orientation: 'portrait' | 'landscape';
  edgeThreshold: number;
  dragThreshold: number;
  viewportWidth: number;
  viewportHeight: number;
  deviceCategory: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export function useDeviceDetection(): DeviceInfo {
  // Initialize with actual values immediately (SSR-safe)
  const getInitialDeviceInfo = (): DeviceInfo => {
    if (typeof window === 'undefined') {
      return {
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isTouchDevice: false,
    orientation: 'landscape',
    edgeThreshold: 35,
    dragThreshold: 80,
    viewportWidth: 1024,
    viewportHeight: 768,
    deviceCategory: 'xl',
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    const isMobile = width < 768;
    const isTablet = width >= 768 && width < 1024;
    const isDesktop = width >= 1024;
    const orientation = height > width ? 'portrait' : 'landscape';

    // Categorize device size
    let deviceCategory: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'md';
    if (width < 375) deviceCategory = 'xs';
    else if (width < 414) deviceCategory = 'sm';
    else if (width < 768) deviceCategory = 'md';
    else if (width < 1024) deviceCategory = 'lg';
    else deviceCategory = 'xl';

    // Adjust thresholds based on device type
    const edgeThreshold = isMobile ? 50 : isTablet ? 40 : 35;
    const dragThreshold = isMobile ? 60 : isTablet ? 70 : 80;

    return {
      isMobile,
      isTablet,
      isDesktop,
      isTouchDevice,
      orientation,
      edgeThreshold,
      dragThreshold,
      viewportWidth: width,
      viewportHeight: height,
      deviceCategory,
    };
  };

  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(getInitialDeviceInfo);

  useEffect(() => {
    const updateDeviceInfo = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      const isMobile = width < 768;
      const isTablet = width >= 768 && width < 1024;
      const isDesktop = width >= 1024;
      const orientation = height > width ? 'portrait' : 'landscape';

      // Categorize device size
      let deviceCategory: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'md';
      if (width < 375) deviceCategory = 'xs';
      else if (width < 414) deviceCategory = 'sm';
      else if (width < 768) deviceCategory = 'md';
      else if (width < 1024) deviceCategory = 'lg';
      else deviceCategory = 'xl';

      // Adjust thresholds based on device type
      const edgeThreshold = isMobile ? 50 : isTablet ? 40 : 35;
      const dragThreshold = isMobile ? 60 : isTablet ? 70 : 80;

      setDeviceInfo({
        isMobile,
        isTablet,
        isDesktop,
        isTouchDevice,
        orientation,
        edgeThreshold,
        dragThreshold,
        viewportWidth: width,
        viewportHeight: height,
        deviceCategory,
      });
    };

    // Only update if values actually changed to prevent unnecessary re-renders
    const currentInfo = getInitialDeviceInfo();
    const hasChanged = 
      currentInfo.isMobile !== deviceInfo.isMobile ||
      currentInfo.isTablet !== deviceInfo.isTablet ||
      currentInfo.isDesktop !== deviceInfo.isDesktop ||
      currentInfo.viewportWidth !== deviceInfo.viewportWidth ||
      currentInfo.viewportHeight !== deviceInfo.viewportHeight;

    if (hasChanged) {
    updateDeviceInfo();
    }

    window.addEventListener('resize', updateDeviceInfo);
    window.addEventListener('orientationchange', updateDeviceInfo);

    return () => {
      window.removeEventListener('resize', updateDeviceInfo);
      window.removeEventListener('orientationchange', updateDeviceInfo);
    };
  }, [deviceInfo.isMobile, deviceInfo.isTablet, deviceInfo.isDesktop, deviceInfo.viewportWidth, deviceInfo.viewportHeight]);

  return deviceInfo;
}
