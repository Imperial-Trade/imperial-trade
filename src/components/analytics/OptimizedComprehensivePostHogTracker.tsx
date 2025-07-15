
import { useOptimizedPostHogTracking } from '@/hooks/useOptimizedPostHogTracking';

export function OptimizedComprehensivePostHogTracker() {
  // Use the optimized tracking hook to enable automatic tracking
  useOptimizedPostHogTracking();
  
  // Return null as this is just a tracking component
  return null;
}
