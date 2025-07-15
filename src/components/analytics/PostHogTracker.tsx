
import { usePostHogTracking } from '@/hooks/usePostHogTracking';

export function PostHogTracker() {
  // This component initializes PostHog tracking across the app
  usePostHogTracking();
  
  // Return null as this is just a tracking component
  return null;
}
