
import { useState, useEffect, useCallback } from 'react';

interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  orientation: 'portrait' | 'landscape';
  edgeThreshold: number;
  dragThreshold: number;
}

export function useOptimizedDeviceDetection(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isTouchDevice: false,
    orientation: 'landscape',
    edgeThreshold: 35,
    dragThreshold: 80,
  });

  const updateDeviceInfo = useCallback(() => {
    // Batch DOM reads to prevent forced reflows
    requestAnimationFrame(() => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      const isMobile = width < 768;
      const isTablet = width >= 768 && width < 1024;
      const isDesktop = width >= 1024;
      const orientation = height > width ? 'portrait' : 'landscape';

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
      });
    });
  }, []);

  useEffect(() => {
    updateDeviceInfo();
    
    // Debounce resize events to prevent excessive reflows
    let timeoutId: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateDeviceInfo, 100);
    };

    window.addEventListener('resize', debouncedResize, { passive: true });
    window.addEventListener('orientationchange', debouncedResize, { passive: true });

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', debouncedResize);
      window.removeEventListener('orientationchange', debouncedResize);
    };
  }, [updateDeviceInfo]);

  return deviceInfo;
}
