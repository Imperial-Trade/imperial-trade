import React, { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DiagnosticResult {
  problem_all_tps_hit: Array<{
    id: string;
    asset: string;
    symbol: string;
    tp_hits: number[];
    total_tps: number;
    status: string;
  }>;
  problem_single_tp_not_closed: Array<{
    id: string;
    asset: string;
    symbol: string;
    tp_hits: number[];
    status: string;
  }>;
  pending_ready_to_activate: Array<{
    id: string;
    asset: string;
    type: string;
    entry: number;
    bid: number;
    ask: number;
  }>;
  monitoring_inactive: Array<{
    signal_id: string;
    asset: string;
    status: string;
    total_monitors: number;
    active_monitors: number;
  }>;
}

interface ReconcileResult {
  signals_closed: number;
  orders_activated: number;
}

export function SignalEngineDiagnostics() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);
  const [reconcileResult, setReconcileResult] = useState<ReconcileResult | null>(null);

  const runFullDiagnostic = async () => {
    setIsRunning(true);
    try {
      console.log('🔍 Starting comprehensive signal engine diagnostic...');

      // Step 1: Run diagnostic using the edge function
      const { data: diagnosticResponse, error: diagnosticError } = await supabase.functions.invoke('signal-diagnostic');
      
      if (diagnosticError || !diagnosticResponse?.success) {
        console.error('❌ Diagnostic query failed:', diagnosticError || diagnosticResponse?.error);
        toast.error('Diagnostic failed: ' + (diagnosticError?.message || diagnosticResponse?.error || 'Unknown error'));
        return;
      }

      console.log('📊 Diagnostic results:', diagnosticResponse.data);
      setDiagnostics(diagnosticResponse.data);

      // Step 2: Run manual reconciliation to fix issues
      const fixedSignals = await fixProblematicSignals(diagnosticResponse.data);
      setReconcileResult(fixedSignals);

      // Step 3: Trigger enhanced alert monitor
      const { error: monitorError } = await supabase.functions.invoke('enhanced-alert-monitor');
      if (monitorError) {
        console.warn('⚠️ Alert monitor trigger failed:', monitorError);
      } else {
        console.log('✅ Enhanced alert monitor triggered');
      }

      setLastRun(new Date());
      toast.success(`Fixed ${fixedSignals.signals_closed} signals and activated ${fixedSignals.orders_activated} orders`);
    } catch (error) {
      console.error('❌ Diagnostic failed:', error);
      toast.error('Diagnostic failed: ' + (error as Error).message);
    } finally {
      setIsRunning(false);
    }
  };

  const fixProblematicSignals = async (diagnosticData: DiagnosticResult): Promise<ReconcileResult> => {
    let signalsClosed = 0;
    let ordersActivated = 0;

    // Fix signals with all TPs hit - determine the highest TP hit for close_reason
    for (const signal of diagnosticData.problem_all_tps_hit) {
      try {
        // Find the highest TP that was hit
        const highestTp = Math.max(...signal.tp_hits);
        const closeReason = `tp${highestTp}` as 'tp1' | 'tp2' | 'tp3' | 'tp4' | 'tp5';

        const { error } = await supabase
          .from('trade_alerts')
          .update({
            status: 'closed',
            close_reason: closeReason,
            updated_at: new Date().toISOString()
          })
          .eq('id', signal.id);

        if (!error) {
          signalsClosed++;
          console.log(`✅ Closed signal ${signal.asset} (${closeReason} hit)`);
        }
      } catch (error) {
        console.error(`❌ Failed to close signal ${signal.asset}:`, error);
      }
    }

    // Fix single TP signals that should be closed
    for (const signal of diagnosticData.problem_single_tp_not_closed) {
      try {
        const { error } = await supabase
          .from('trade_alerts')
          .update({
            status: 'closed',
            close_reason: 'tp1',
            updated_at: new Date().toISOString()
          })
          .eq('id', signal.id);

        if (!error) {
          signalsClosed++;
          console.log(`✅ Closed signal ${signal.asset} (TP1 hit)`);
        }
      } catch (error) {
        console.error(`❌ Failed to close signal ${signal.asset}:`, error);
      }
    }

    // Activate pending orders that are ready
    for (const order of diagnosticData.pending_ready_to_activate) {
      try {
        const { error } = await supabase
          .from('trade_alerts')
          .update({
            status: 'active',
            activated_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', order.id);

        if (!error) {
          ordersActivated++;
          console.log(`✅ Activated pending order ${order.asset}`);
        }
      } catch (error) {
        console.error(`❌ Failed to activate order ${order.asset}:`, error);
      }
    }

    return { signals_closed: signalsClosed, orders_activated: ordersActivated };
  };

  const getTotalIssues = () => {
    if (!diagnostics) return 0;
    return (
      diagnostics.problem_all_tps_hit?.length +
      diagnostics.problem_single_tp_not_closed?.length +
      diagnostics.pending_ready_to_activate?.length +
      diagnostics.monitoring_inactive?.length
    ) || 0;
  };

  const getStatusColor = (count: number) => {
    if (count === 0) return 'text-green-600 bg-green-50 border-green-200';
    if (count <= 2) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getStatusIcon = (count: number) => {
    if (count === 0) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (count <= 2) return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    return <XCircle className="h-4 w-4 text-red-600" />;
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Signal Engine Health Check</h2>
          <p className="text-muted-foreground">
            Comprehensive diagnostic for TP detection, pending orders, and alert monitoring
          </p>
        </div>
        <Button 
          onClick={runFullDiagnostic} 
          disabled={isRunning}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRunning ? 'animate-spin' : ''}`} />
          {isRunning ? 'Running Diagnostic...' : 'Run Full Diagnostic'}
        </Button>
      </div>

      {lastRun && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            Last diagnostic run: {lastRun.toLocaleString()}
            {reconcileResult && (
              <span className="ml-4 font-medium">
                Fixed {reconcileResult.signals_closed} signals, activated {reconcileResult.orders_activated} orders
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {diagnostics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Signals with All TPs Hit But Not Closed */}
          <Card className={getStatusColor(diagnostics.problem_all_tps_hit?.length || 0)}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                {getStatusIcon(diagnostics.problem_all_tps_hit?.length || 0)}
                All TPs Hit - Should Be Closed
                <Badge variant="outline">
                  {diagnostics.problem_all_tps_hit?.length || 0}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {diagnostics.problem_all_tps_hit?.length > 0 ? (
                <div className="space-y-2">
                  {diagnostics.problem_all_tps_hit.map((signal) => (
                    <div key={signal.id} className="text-sm">
                      <div className="font-medium">{signal.asset} ({signal.symbol})</div>
                      <div className="text-muted-foreground">
                        TPs Hit: {signal.tp_hits?.join(', ')} / {signal.total_tps} total
                        <Badge variant="outline" className="ml-2">{signal.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">✅ All signals properly closed</div>
              )}
            </CardContent>
          </Card>

          {/* Single TP Signals Not Closed */}
          <Card className={getStatusColor(diagnostics.problem_single_tp_not_closed?.length || 0)}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                {getStatusIcon(diagnostics.problem_single_tp_not_closed?.length || 0)}
                Single TP Hit - Should Be Closed
                <Badge variant="outline">
                  {diagnostics.problem_single_tp_not_closed?.length || 0}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {diagnostics.problem_single_tp_not_closed?.length > 0 ? (
                <div className="space-y-2">
                  {diagnostics.problem_single_tp_not_closed.map((signal) => (
                    <div key={signal.id} className="text-sm">
                      <div className="font-medium">{signal.asset} ({signal.symbol})</div>
                      <div className="text-muted-foreground">
                        TP1 Hit: {signal.tp_hits?.includes(1) ? '✅' : '❌'}
                        <Badge variant="outline" className="ml-2">{signal.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">✅ All single TP signals properly closed</div>
              )}
            </CardContent>
          </Card>

          {/* Pending Orders Ready to Activate */}
          <Card className={getStatusColor(diagnostics.pending_ready_to_activate?.length || 0)}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                {getStatusIcon(diagnostics.pending_ready_to_activate?.length || 0)}
                Pending Orders - Ready to Activate
                <Badge variant="outline">
                  {diagnostics.pending_ready_to_activate?.length || 0}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {diagnostics.pending_ready_to_activate?.length > 0 ? (
                <div className="space-y-2">
                  {diagnostics.pending_ready_to_activate.map((order) => (
                    <div key={order.id} className="text-sm">
                      <div className="font-medium">{order.asset}</div>
                      <div className="text-muted-foreground">
                        {order.type}: Entry {order.entry} | 
                        Bid: {order.bid} | Ask: {order.ask}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">✅ No pending orders waiting</div>
              )}
            </CardContent>
          </Card>

          {/* Monitoring Issues */}
          <Card className={getStatusColor(diagnostics.monitoring_inactive?.length || 0)}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                {getStatusIcon(diagnostics.monitoring_inactive?.length || 0)}
                Alert Monitoring Issues
                <Badge variant="outline">
                  {diagnostics.monitoring_inactive?.length || 0}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {diagnostics.monitoring_inactive?.length > 0 ? (
                <div className="space-y-2">
                  {diagnostics.monitoring_inactive.map((monitor) => (
                    <div key={monitor.signal_id} className="text-sm">
                      <div className="font-medium">{monitor.asset}</div>
                      <div className="text-muted-foreground">
                        Active: {monitor.active_monitors}/{monitor.total_monitors} monitors
                        <Badge variant="outline" className="ml-2">{monitor.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">✅ All monitoring active</div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {diagnostics && getTotalIssues() === 0 && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            🎉 Signal engine is healthy! All TPs are properly detected, pending orders are correctly managed, 
            and alert monitoring is active.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
