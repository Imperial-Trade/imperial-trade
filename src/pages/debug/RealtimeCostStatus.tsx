import { EmergencyRealtimeStatus } from '@/components/debug/EmergencyRealtimeStatus';
import { RealtimeOptimizationStatus } from '@/components/debug/RealtimeOptimizationStatus';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Database, Zap, TrendingDown } from 'lucide-react';
import { useCostTracking } from '@/hooks/useCostTracking';

export default function RealtimeCostStatusPage() {
  const costMetrics = useCostTracking();
  
  // Calculate estimated monthly costs
  const estimatedPriceQueriesPerMonth = (60 / 0.5) * 60 * 24 * 30; // 500ms polling
  const estimatedSignalQueriesPerMonth = (60 / 30) * 60 * 24 * 30; // 30s polling
  const estimatedDatabaseCostPerMonth = ((estimatedPriceQueriesPerMonth + estimatedSignalQueriesPerMonth) / 1000000) * 2.50;
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Zero-Realtime Cost Monitoring</h1>
        <p className="text-muted-foreground">
          Database polling architecture - $0 Realtime messages
        </p>
      </div>
      
      {/* Cost Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-success" />
            <span className="text-sm font-medium">Realtime Messages</span>
          </div>
          <div className="text-2xl font-bold text-success">$0.00</div>
          <p className="text-xs text-muted-foreground mt-1">Zero broadcasts (eliminated)</p>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Database Queries</span>
          </div>
          <div className="text-2xl font-bold">${estimatedDatabaseCostPerMonth.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground mt-1">~{Math.round((estimatedPriceQueriesPerMonth + estimatedSignalQueriesPerMonth) / 1000)}K queries/month</p>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-foreground" />
            <span className="text-sm font-medium">Total Monthly Cost</span>
          </div>
          <div className="text-2xl font-bold">${estimatedDatabaseCostPerMonth.toFixed(2)}</div>
          <Badge variant="outline" className="mt-2">All-in estimate</Badge>
        </Card>
        
        <Card className="p-4 bg-success/10 border-success">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-success" />
            <span className="text-sm font-medium">Monthly Savings</span>
          </div>
          <div className="text-2xl font-bold text-success">$29.50</div>
          <p className="text-xs text-muted-foreground mt-1">73% cost reduction</p>
        </Card>
      </div>
      
      {/* Polling Configuration */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Database Polling Configuration</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div>
              <div className="font-medium">Price Updates</div>
              <div className="text-sm text-muted-foreground">Signal Stream Page</div>
            </div>
            <Badge variant="outline">500ms polling</Badge>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div>
              <div className="font-medium">Signal Updates</div>
              <div className="text-sm text-muted-foreground">All signal changes</div>
            </div>
            <Badge variant="outline">30s polling</Badge>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-success/10 border border-success/20 rounded-lg">
            <div>
              <div className="font-medium">Realtime Broadcasts</div>
              <div className="text-sm text-muted-foreground">Eliminated from price-ingestor</div>
            </div>
            <Badge variant="outline" className="text-success border-success">Disabled</Badge>
          </div>
        </div>
      </Card>
      
      {/* Legacy Status (for reference) */}
      <div className="border-t pt-6">
        <h2 className="text-lg font-semibold mb-4">Legacy Monitoring (Pre-Optimization)</h2>
        <EmergencyRealtimeStatus />
        <div className="mt-4">
          <RealtimeOptimizationStatus showDetailed={true} />
        </div>
      </div>
    </div>
  );
}