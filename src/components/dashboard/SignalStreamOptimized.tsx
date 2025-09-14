import React, { Suspense, useDeferredValue, memo } from 'react';
import LoadingSpinner from '@/components/layout/LoadingSpinner';

// Lazy load the heavy SignalStream component
const SignalStream = React.lazy(() => import('@/pages/dashboard/signal-stream/SignalStream'));

/**
 * Optimized wrapper for SignalStream that defers loading during welcome animation
 */
const SignalStreamOptimized: React.FC = memo(() => {
  // Defer the component loading to prevent blocking during animation
  const deferredComponent = useDeferredValue(SignalStream);
  const Component = deferredComponent;

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    }>
      <Component />
    </Suspense>
  );
});

SignalStreamOptimized.displayName = 'SignalStreamOptimized';

export default SignalStreamOptimized;