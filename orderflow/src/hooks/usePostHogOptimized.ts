import { useEffect, useRef } from 'react';
import { posthog } from 'posthog-js';

/**
 * Optimized PostHog hook that delays survey loading until after welcome animation
 */
export function usePostHogOptimized(hasSeenWelcome: boolean) {
  const surveysEnabled = useRef(false);
  
  useEffect(() => {
    // Only enable surveys after welcome animation is complete
    if (hasSeenWelcome && !surveysEnabled.current && posthog.__loaded) {
      // Use requestIdleCallback to avoid blocking main thread
      const enableSurveys = () => {
        posthog.config.disable_surveys = false;
        surveysEnabled.current = true;
      };
      
      if ('requestIdleCallback' in window) {
        requestIdleCallback(enableSurveys, { timeout: 1000 });
      } else {
        setTimeout(enableSurveys, 500);
      }
    }
  }, [hasSeenWelcome]);
  
  return {
    surveysEnabled: surveysEnabled.current
  };
}