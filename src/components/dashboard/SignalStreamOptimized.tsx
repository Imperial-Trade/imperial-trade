import React from 'react';
import SignalStream from '@/pages/dashboard/signal-stream/SignalStream';
import { SystemHealthMonitor } from '@/components/signals/SystemHealthMonitor';

/**
 * Direct wrapper for SignalStream with system health monitoring
 */
const SignalStreamOptimized: React.FC = React.memo(() => {
  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="flex-1">
          <SignalStream />
        </div>
        <div className="w-64">
          <SystemHealthMonitor />
        </div>
      </div>
    </div>
  );
});

SignalStreamOptimized.displayName = 'SignalStreamOptimized';

export default SignalStreamOptimized;