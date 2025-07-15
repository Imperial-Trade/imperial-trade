
import { useOptimizedPostHogTracking } from '@/hooks/useOptimizedPostHogTracking';

export function PostHogTracker() {
  // Use the performance-optimized tracking hook
  useOptimizedPostHogTracking();
  
  // Return null as this is just a tracking component
  return null;
}
