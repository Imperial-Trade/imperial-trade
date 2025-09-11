import { EmergencyRealtimeStatus } from '@/components/debug/EmergencyRealtimeStatus';
import { RealtimeOptimizationStatus } from '@/components/debug/RealtimeOptimizationStatus';

export default function RealtimeCostStatusPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Realtime Cost Status</h1>
        <p className="text-muted-foreground">
          Monitor and control realtime message costs and optimization status
        </p>
      </div>
      
      <EmergencyRealtimeStatus />
      
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Optimization Details</h2>
        <RealtimeOptimizationStatus showDetailed={true} />
      </div>
    </div>
  );
}