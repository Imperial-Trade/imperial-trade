import React from 'react';
import Phase4AnalyticsDashboard from '@/components/analytics/Phase4AnalyticsDashboard';

export default function AnalyticsDashboard() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h2>
        <div className="text-sm text-muted-foreground">
          Real-time trading and notification analytics
        </div>
      </div>
      <Phase4AnalyticsDashboard />
    </div>
  );
}