import { memo } from 'react';
import SignalStream from '@/pages/dashboard/signal-stream/SignalStream';

/**
 * Direct wrapper for SignalStream
 */
const SignalStreamOptimized = memo(() => {
  return <SignalStream />;
});

SignalStreamOptimized.displayName = 'SignalStreamOptimized';

export default SignalStreamOptimized;