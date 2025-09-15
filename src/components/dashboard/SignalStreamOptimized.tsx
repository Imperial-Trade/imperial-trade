import React, { memo } from 'react';
import SignalStream from '@/pages/dashboard/signal-stream/SignalStream';

/**
 * Direct wrapper for SignalStream - removed lazy loading to prevent context isolation
 */
const SignalStreamOptimized: React.FC = memo(() => {
  return <SignalStream />;
});

SignalStreamOptimized.displayName = 'SignalStreamOptimized';

export default SignalStreamOptimized;