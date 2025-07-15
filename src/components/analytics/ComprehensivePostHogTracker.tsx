
import { useComprehensivePostHogTracking } from '@/hooks/useComprehensivePostHogTracking';

export function ComprehensivePostHogTracker() {
  // Use the comprehensive tracking hook to enable automatic tracking
  useComprehensivePostHogTracking();
  
  // Return null as this is just a tracking component
  return null;
}
