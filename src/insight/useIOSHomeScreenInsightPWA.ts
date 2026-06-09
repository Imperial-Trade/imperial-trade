import { useEffect, useState } from 'react';

/**
 * True when running as an iPhone/iPad web app added to the home screen (standalone).
 * Used to swap the Insight search field for a custom keyboard (no iOS accessory bar).
 */
export function useIOSHomeScreenInsightPWA(): boolean {
  const [isHomeScreen, setIsHomeScreen] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    const isIOSDevice =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsHomeScreen(isIOSDevice && Boolean(standalone));
  }, []);

  return isHomeScreen;
}
