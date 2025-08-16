import React from 'react';
import IntegratedPhaseManager from '@/components/testing/IntegratedPhaseManager';

export default function PhaseManager() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Development Phase Manager</h2>
        <div className="text-sm text-muted-foreground">
          Testing and development environment
        </div>
      </div>
      <IntegratedPhaseManager />
    </div>
  );
}