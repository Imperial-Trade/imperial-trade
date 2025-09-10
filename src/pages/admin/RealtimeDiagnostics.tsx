import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeTelemetry } from '@/hooks/useRealtimeTelemetry';
import { RealtimeOptimizationStatus } from '@/components/debug/RealtimeOptimizationStatus';
import { Activity, TrendingDown, Zap, AlertTriangle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

interface TelemetryRecord {
  date: string;
  total_messages: number;
  total_connections: number;
  message_rate: number;
  cost_estimate: number;
  optimization_rate: number;
  clamp_activations: number;
  channel_breakdown: Record<string, any>;
}

export const RealtimeDiagnostics: React.FC = () => {
  const { telemetryData, syncTelemetry } = useRealtimeTelemetry();
  const [historicalData, setHistoricalData] = useState<TelemetryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTelemetryData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('realtime_telemetry')
        .select('*')
        .order('date', { ascending: false })
        .limit(7);

      if (error) throw error;
      setHistoricalData(data || []);
    } catch (error) {
      console.error('Failed to fetch telemetry data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetryData();
  }, []);

  const handleRefresh = async () => {
    await syncTelemetry();
    await fetchTelemetryData();
  };

  const totalSavings = historicalData.length > 0 
    ? historicalData[0].optimization_rate 
    : telemetryData.optimizationRate;

  const avgCostEstimate = historicalData.length > 0
    ? historicalData.reduce((sum, record) => sum + record.cost_estimate, 0) / historicalData.length
    : telemetryData.costEstimate;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Realtime Diagnostics</h1>
          <p className="text-muted-foreground">Monitor realtime optimization performance and costs</p>
        </div>
        <Button onClick={handleRefresh} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>

      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Current Session Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RealtimeOptimizationStatus showDetailed />
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Messages Today</p>
                <p className="text-2xl font-bold">{telemetryData.totalMessages.toLocaleString()}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Rate: {telemetryData.messageRate.toFixed(1)}/hour
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Cost Estimate</p>
                <p className="text-2xl font-bold">${avgCostEstimate.toFixed(4)}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Monthly estimate</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Optimization Rate</p>
                <p className="text-2xl font-bold">{totalSavings.toFixed(1)}%</p>
              </div>
              <Zap className="w-8 h-8 text-yellow-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Message reduction</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Clamp Activations</p>
                <p className="text-2xl font-bold">
                  {historicalData[0]?.clamp_activations || 0}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Today's total</p>
          </CardContent>
        </Card>
      </div>

      {/* Historical Data */}
      <Card>
        <CardHeader>
          <CardTitle>7-Day Historical Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Date</th>
                  <th className="text-right py-2">Messages</th>
                  <th className="text-right py-2">Rate/Hour</th>
                  <th className="text-right py-2">Cost Est.</th>
                  <th className="text-right py-2">Optimization</th>
                  <th className="text-right py-2">Clamps</th>
                </tr>
              </thead>
              <tbody>
                {historicalData.map((record) => (
                  <tr key={record.date} className="border-b">
                    <td className="py-2">
                      {format(new Date(record.date), 'MMM dd, yyyy')}
                    </td>
                    <td className="text-right py-2">
                      {record.total_messages.toLocaleString()}
                    </td>
                    <td className="text-right py-2">
                      {record.message_rate.toFixed(1)}
                    </td>
                    <td className="text-right py-2">
                      ${record.cost_estimate.toFixed(4)}
                    </td>
                    <td className="text-right py-2">
                      <Badge variant="secondary">
                        {record.optimization_rate.toFixed(1)}%
                      </Badge>
                    </td>
                    <td className="text-right py-2">
                      {record.clamp_activations > 0 ? (
                        <Badge variant="destructive">
                          {record.clamp_activations}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">0</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {historicalData.length === 0 && !loading && (
              <p className="text-center text-muted-foreground py-8">
                No historical data available yet. Data will appear after the first day of usage.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* System Health Indicators */}
      <Card>
        <CardHeader>
          <CardTitle>System Health Indicators</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <span className="text-sm font-medium">Message Filtering</span>
              <Badge variant="default">Active</Badge>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <span className="text-sm font-medium">Single Tab Leadership</span>
              <Badge variant="default">Enforced</Badge>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <span className="text-sm font-medium">Route Gating</span>
              <Badge variant="default">Active</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};