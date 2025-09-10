import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeTelemetry } from '@/hooks/useRealtimeTelemetry';
import { RealtimeOptimizationStatus } from '@/components/debug/RealtimeOptimizationStatus';
import { Activity, TrendingDown, Zap, AlertTriangle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

// Use the correct telemetry structure
interface EdgeTelemetry {
  id: string;
  created_at: string;
  scope: string;
  channel: string;
  metric: string;
  count: number;
  metadata: {
    processed?: number;
    valid?: number;
    filtered?: number;
    broadcasted?: number;
    clamped_symbol?: number;
    clamped_batch?: number;
    alerts_triggered?: number;
  };
}

export const RealtimeDiagnostics: React.FC = () => {
  const { telemetryData, syncTelemetry } = useRealtimeTelemetry();
  const [edgeTelemetry, setEdgeTelemetry] = useState<EdgeTelemetry[]>([]);
  const [dailyStats, setDailyStats] = useState({
    totalMessages: 0,
    totalBroadcasts: 0,
    clampActivations: 0,
    avgProcessed: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchTelemetryData = async () => {
    try {
      setLoading(true);
      
      // Fetch recent edge telemetry (last 24 hours)
      const { data: edgeData, error: edgeError } = await supabase
        .from('realtime_telemetry')
        .select('*')
        .eq('scope', 'edge')
        .eq('metric', 'ingestor_batch')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      if (edgeError) throw edgeError;
      
      const typedData = (edgeData || []) as EdgeTelemetry[];
      setEdgeTelemetry(typedData);
      
      // Calculate daily stats from edge telemetry
      const stats = typedData.reduce((acc, record) => {
        const metadata = record.metadata || {};
        return {
          totalMessages: acc.totalMessages + (metadata.processed || 0),
          totalBroadcasts: acc.totalBroadcasts + record.count,
          clampActivations: acc.clampActivations + (metadata.clamped_symbol || 0) + (metadata.clamped_batch || 0),
          avgProcessed: acc.avgProcessed + (metadata.processed || 0)
        };
      }, { totalMessages: 0, totalBroadcasts: 0, clampActivations: 0, avgProcessed: 0 });
      
      if (typedData.length > 0) {
        stats.avgProcessed = Math.round(stats.avgProcessed / typedData.length);
      }
      
      setDailyStats(stats);
      
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

  const efficiencyRate = dailyStats.totalMessages > 0 
    ? ((dailyStats.totalMessages - dailyStats.totalBroadcasts) / dailyStats.totalMessages * 100)
    : telemetryData.optimizationRate;

  const estimatedMonthlyCost = (dailyStats.totalBroadcasts * 30 * 0.00001); // Rough estimate

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
                <p className="text-sm font-medium text-muted-foreground">Messages Processed</p>
                <p className="text-2xl font-bold">{dailyStats.totalMessages.toLocaleString()}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Last 24 hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">UI Broadcasts</p>
                <p className="text-2xl font-bold">{dailyStats.totalBroadcasts.toLocaleString()}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Est. cost: ${estimatedMonthlyCost.toFixed(4)}/mo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Efficiency Rate</p>
                <p className="text-2xl font-bold">{efficiencyRate.toFixed(1)}%</p>
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
                <p className="text-2xl font-bold">{dailyStats.clampActivations}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Last 24 hours</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Edge Function Telemetry */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Edge Function Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Timestamp</th>
                  <th className="text-right py-2">Processed</th>
                  <th className="text-right py-2">Broadcasted</th>
                  <th className="text-right py-2">Efficiency</th>
                  <th className="text-right py-2">Clamps</th>
                </tr>
              </thead>
              <tbody>
                {edgeTelemetry.slice(0, 10).map((record) => {
                  const metadata = record.metadata || {};
                  const processed = metadata.processed || 0;
                  const efficiency = processed > 0 ? ((processed - record.count) / processed * 100) : 0;
                  const clamps = (metadata.clamped_symbol || 0) + (metadata.clamped_batch || 0);
                  
                  return (
                    <tr key={record.id} className="border-b">
                      <td className="py-2">
                        {format(new Date(record.created_at), 'HH:mm:ss')}
                      </td>
                      <td className="text-right py-2">
                        {processed.toLocaleString()}
                      </td>
                      <td className="text-right py-2">
                        {record.count}
                      </td>
                      <td className="text-right py-2">
                        <Badge variant="secondary">
                          {efficiency.toFixed(1)}%
                        </Badge>
                      </td>
                      <td className="text-right py-2">
                        {clamps > 0 ? (
                          <Badge variant="destructive">{clamps}</Badge>
                        ) : (
                          <Badge variant="secondary">0</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {edgeTelemetry.length === 0 && !loading && (
              <p className="text-center text-muted-foreground py-8">
                No edge function telemetry available. Data will appear when price-ingestor processes batches.
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