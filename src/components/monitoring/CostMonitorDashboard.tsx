import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useCostTracking } from '@/hooks/useCostTracking';
import { DollarSign, TrendingUp, AlertTriangle, RefreshCw } from 'lucide-react';

export default function CostMonitorDashboard() {
  const costMetrics = useCostTracking();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'text-destructive';
      case 'warning': return 'text-warning';
      default: return 'text-success';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'critical': return <AlertTriangle className="w-4 h-4 text-destructive" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-warning" />;
      default: return <TrendingUp className="w-4 h-4 text-success" />;
    }
  };

  const costProgress = Math.min((costMetrics.dailyCostUSD / 20) * 100, 100); // 20 USD daily limit

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Cost Monitoring</h3>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(costMetrics.status)}
            <Badge variant={costMetrics.status === 'optimal' ? 'default' : 'destructive'}>
              {costMetrics.status.toUpperCase()}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 border rounded-lg">
            <p className="text-sm text-muted-foreground">Messages</p>
            <p className="text-2xl font-bold">{costMetrics.realtimeMessages.toLocaleString()}</p>
          </div>
          <div className="text-center p-3 border rounded-lg">
            <p className="text-sm text-muted-foreground">Current Cost</p>
            <p className="text-2xl font-bold">{costMetrics.summary.current}</p>
          </div>
          <div className="text-center p-3 border rounded-lg">
            <p className="text-sm text-muted-foreground">Daily Rate</p>
            <p className={`text-2xl font-bold ${getStatusColor(costMetrics.status)}`}>
              {costMetrics.summary.daily}
            </p>
          </div>
          <div className="text-center p-3 border rounded-lg">
            <p className="text-sm text-muted-foreground">Monthly Proj.</p>
            <p className="text-2xl font-bold">{costMetrics.summary.monthly}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Daily Cost Progress</span>
            <span className="text-sm font-medium">${costMetrics.dailyCostUSD.toFixed(2)} / $20.00</span>
          </div>
          <Progress 
            value={costProgress} 
            className={`h-3 ${costMetrics.status === 'critical' ? 'bg-destructive/20' : ''}`}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="text-center p-2 bg-muted/50 rounded">
            <p className="text-xs text-muted-foreground">Hourly Rate</p>
            <p className="text-lg font-semibold">{costMetrics.currentHourlyRate.toLocaleString()}/hr</p>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded">
            <p className="text-xs text-muted-foreground">Peak Hour</p>
            <p className="text-lg font-semibold">{costMetrics.peakHourlyRate.toLocaleString()}</p>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={costMetrics.resetMetrics}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-3 h-3" />
            Reset
          </Button>
        </div>
      </Card>

      {costMetrics.alerts.length > 0 && (
        <Card className="p-4">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Recent Alerts
          </h4>
          <div className="space-y-2">
            {costMetrics.alerts.slice(0, 5).map((alert, index) => (
              <div 
                key={index}
                className={`p-2 rounded border-l-4 ${
                  alert.type === 'critical' ? 'border-l-destructive bg-destructive/5' : 'border-l-warning bg-warning/5'
                }`}
              >
                <p className="text-sm font-medium">{alert.message}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(alert.timestamp).toLocaleTimeString()}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}