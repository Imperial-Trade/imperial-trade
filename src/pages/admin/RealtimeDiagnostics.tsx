import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeTelemetry } from '@/hooks/useRealtimeTelemetry';
import { RealtimeOptimizationStatus } from '@/components/debug/RealtimeOptimizationStatus';
import { useSharedRealtime } from '@/contexts/SharedRealtimeContext';
import { useSignalRealtime } from '@/contexts/SignalRealtimeContext';
import { useTelemetry } from '@/contexts/TelemetryContext';
import { useOptimizedWebSocketPrices } from '@/contexts/OptimizedWebSocketPriceContext';
import { Activity, TrendingDown, Zap, AlertTriangle, RefreshCw, Database, Radio, BarChart, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

// Use the correct telemetry structure from the new table
interface EdgeTelemetry {
  id: string;
  created_at: string;
  function_name: string;
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
  batch_id?: string;
}

export const RealtimeDiagnostics: React.FC = () => {
  const { telemetryData, syncTelemetry, reset: resetTelemetry } = useRealtimeTelemetry();
  const telemetry = useTelemetry();
  const { connectionState } = useSharedRealtime();
  const { connectionStatus: signalStatus, lastUpdated: signalLastUpdated } = useSignalRealtime();
  const { connectionStatus: priceStatus, lastUpdated: priceLastUpdated } = useOptimizedWebSocketPrices();
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
        .from('edge_function_telemetry')
        .select('*')
        .eq('function_name', 'price-ingestor')
        .eq('metric', 'ingestor_batch')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      if (edgeError) throw edgeError;
      
      const typedData = (edgeData || []) as EdgeTelemetry[];
      setEdgeTelemetry(typedData);
      
      // Calculate daily stats from edge telemetry (Phase C: Fixed clamp aggregation)
      const stats = typedData.reduce((acc, record) => {
        const metadata = record.metadata as any || {};
        // Phase C: Aggregate clamps using clamped_symbol_total + clamped_batch
        const perSymbolTotal = metadata.clamped_symbol_total || 0;
        const batchClamps = metadata.clamped_batch || 0;
        return {
          totalMessages: acc.totalMessages + (metadata.processed || 0),
          totalBroadcasts: acc.totalBroadcasts + record.count,
          clampActivations: acc.clampActivations + perSymbolTotal + batchClamps,
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

  const handleResetCounters = () => {
    telemetry.reset();
    console.log('🔄 Client-side telemetry counters reset');
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
        <div className="flex gap-2">
          <Button onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
          <Button onClick={handleResetCounters} variant="outline">
            Reset Counters
          </Button>
        </div>
      </div>

      {/* Session Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Session Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Session ID</span>
              <span className="font-mono text-xs">{telemetry.sessionInfo.sessionId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Build Version</span>
              <span className="font-mono text-xs">{telemetry.sessionInfo.buildVersion}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per-Channel Message Counters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Per-Channel Message Counters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{telemetry.counters.price_update}</div>
              <div className="text-xs text-muted-foreground">Price Updates (v2)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{telemetry.counters.price_update_v3}</div>
              <div className="text-xs text-muted-foreground">Price Updates (v3)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{telemetry.counters.db_change_v3}</div>
              <div className="text-xs text-muted-foreground">DB Changes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{telemetry.counters.signal_change_v3}</div>
              <div className="text-xs text-muted-foreground">Signal Updates</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive">{telemetry.counters.clamp_activation}</div>
              <div className="text-xs text-muted-foreground">Clamp Activations</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PHASE C: Per-Channel Telemetry Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Database Changes (Shared)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Connection Status</span>
                <Badge variant={connectionState.isConnected ? "default" : "destructive"}>
                  {connectionState.connectionStatus}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Active Subscribers</span>
                <span className="font-mono">{connectionState.subscribers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Messages (Session)</span>
                <span className="font-mono">{connectionState.sessionMessages}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Last Updated</span>
                <span className="text-xs text-muted-foreground">
                  {connectionState.lastUpdated ? format(connectionState.lastUpdated, 'HH:mm:ss') : 'Never'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radio className="w-5 h-5" />
              Signal Updates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Connection Status</span>
                <Badge variant={signalStatus === 'connected' ? "default" : "destructive"}>
                  {signalStatus}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Event Version</span>
                <Badge variant="outline">signal_change_v3</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Last Updated</span>
                <span className="text-xs text-muted-foreground">
                  {signalLastUpdated ? format(signalLastUpdated, 'HH:mm:ss') : 'Never'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Session Status */}
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

      {/* Clamps Panel */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Rate Limiting & Clamps
          </CardTitle>
          <Badge variant={dailyStats.clampActivations > 0 ? "destructive" : "secondary"}>
            {dailyStats.clampActivations > 0 ? 'Active' : 'Normal'}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium">Total Clamp Activations (24h)</div>
              <div className="text-2xl font-bold text-destructive">{dailyStats.clampActivations}</div>
            </div>
            <div>
              <div className="text-sm font-medium">Clamp Rate</div>
              <div className="text-2xl font-bold">
                {dailyStats.totalMessages > 0 ? 
                  ((dailyStats.clampActivations / dailyStats.totalMessages) * 100).toFixed(2) : 0}%
              </div>
            </div>
          </div>
          
          {/* Recent Clamp Events */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Recent Clamp Events</div>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {edgeTelemetry
                .filter(record => 
                  (record.metadata?.clamped_symbol && record.metadata.clamped_symbol > 0) ||
                  (record.metadata?.clamped_batch && record.metadata.clamped_batch > 0)
                )
                .slice(0, 5)
                .map((record, index) => (
                  <div key={index} className="flex justify-between items-center text-xs p-2 bg-muted rounded">
                    <span className="text-muted-foreground">
                      {format(new Date(record.created_at), 'HH:mm:ss')}
                    </span>
                    <div className="flex gap-2">
                      {record.metadata?.clamped_symbol && record.metadata.clamped_symbol > 0 && (
                        <Badge variant="outline" className="text-xs">
                          Symbol: {record.metadata.clamped_symbol}
                        </Badge>
                      )}
                      {record.metadata?.clamped_batch && record.metadata.clamped_batch > 0 && (
                        <Badge variant="outline" className="text-xs">
                          Batch: {record.metadata.clamped_batch}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
            </div>
            {edgeTelemetry.filter(r => 
              (r.metadata?.clamped_symbol && r.metadata.clamped_symbol > 0) ||
              (r.metadata?.clamped_batch && r.metadata.clamped_batch > 0)
            ).length === 0 && (
              <div className="text-xs text-muted-foreground text-center py-2">
                No clamp events in the last 24 hours
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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

      {/* Clamps Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Clamps (Last 24h)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {edgeTelemetry.length > 0 ? (
              <>
                <div className="text-sm text-muted-foreground">
                  Per-symbol rate limit activations from edge function telemetry
                </div>
                <div className="space-y-2">
                  {Object.entries(
                  edgeTelemetry.reduce((acc, record) => {
                    const perSymbolClamps = (record.metadata as any)?.per_symbol_clamps || {};
                    Object.entries(perSymbolClamps).forEach(([symbol, count]) => {
                      acc[symbol] = (acc[symbol] || 0) + (count as number);
                    });
                    return acc;
                  }, {} as Record<string, number>)
                  )
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 10)
                    .map(([symbol, totalClamps]) => (
                      <div key={symbol} className="flex justify-between items-center p-2 border rounded">
                        <span className="font-mono text-sm">{symbol}</span>
                        <Badge variant={totalClamps > 50 ? "destructive" : "secondary"}>
                          {totalClamps} clamps
                        </Badge>
                      </div>
                    ))}
                </div>
              </>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                No clamp data available. Data will appear when rate limits are activated.
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
              <span className="text-sm font-medium">Event Versioning</span>
              <Badge variant="default">db_change_v3, signal_change_v3</Badge>
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