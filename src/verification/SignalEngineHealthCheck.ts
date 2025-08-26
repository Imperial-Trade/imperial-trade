// Signal Logic Engine Health Check Utility
// Run this to verify Phase 2 implementation status

import { supabase } from '@/integrations/supabase/client';

interface HealthCheckResult {
  component: string;
  status: 'healthy' | 'warning' | 'error';
  details: string;
  metrics?: Record<string, any>;
}

export class SignalEngineHealthCheck {
  async runFullHealthCheck(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];

    results.push(await this.checkAlertMonitoringSystem());
    results.push(await this.checkPriceProcessingFunctions());
    results.push(await this.checkSignalStatusTransitions());
    results.push(await this.checkPendingLimitActivation());
    results.push(await this.checkAllTPsHitButNotClosed());
    results.push(await this.checkNotificationTriggers());
    results.push(await this.checkDatabaseConsistency());

    return results;
  }

  private async checkAlertMonitoringSystem(): Promise<HealthCheckResult> {
    try {
      // Check if alert_monitoring table has active alerts
      const { data: activeAlerts, error } = await supabase
        .from('alert_monitoring')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      // Check if monitoring covers all active signals
      const { data: activeSignals, error: signalsError } = await supabase
        .from('trade_alerts')
        .select('id, tradermade_symbol, status')
        .in('status', ['active', 'partially_profited']);

      if (signalsError) throw signalsError;

      const monitoredSymbols = new Set(activeAlerts?.map(a => a.symbol) || []);
      const activeSymbols = new Set(activeSignals?.map(s => s.tradermade_symbol) || []);
      
      const unmatchedSymbols = Array.from(activeSymbols).filter(s => !monitoredSymbols.has(s));

      return {
        component: 'Alert Monitoring System',
        status: unmatchedSymbols.length > 0 ? 'warning' : 'healthy',
        details: unmatchedSymbols.length > 0 
          ? `${unmatchedSymbols.length} active signals not monitored: ${unmatchedSymbols.join(', ')}`
          : `All ${activeSignals?.length || 0} active signals properly monitored`,
        metrics: {
          activeAlerts: activeAlerts?.length || 0,
          activeSignals: activeSignals?.length || 0,
          monitoredSymbols: monitoredSymbols.size
        }
      };
    } catch (error) {
      return {
        component: 'Alert Monitoring System',
        status: 'error',
        details: `Failed to check alert monitoring: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async checkPriceProcessingFunctions(): Promise<HealthCheckResult> {
    try {
      // Test the enhanced price processing function
      const { data, error } = await supabase.rpc('process_price_alerts_enhanced', {
        p_symbol: 'EURUSD',
        p_current_bid: 1.1000,
        p_current_ask: 1.1002
      });

      if (error) throw error;

      return {
        component: 'Price Processing Functions',
        status: 'healthy',
        details: 'Enhanced price processing functions operational',
        metrics: {
          testResult: data ? 'success' : 'no_alerts',
          enhancedFunctionAvailable: true
        }
      };
    } catch (error) {
      return {
        component: 'Price Processing Functions', 
        status: 'error',
        details: `Price processing functions not working: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async checkSignalStatusTransitions(): Promise<HealthCheckResult> {
    try {
      // Check for proper status distribution
      const { data: statusCounts, error } = await supabase
        .from('trade_alerts')
        .select('status')
        .then(result => {
          if (result.error) throw result.error;
          
          const counts = result.data?.reduce((acc, alert) => {
            acc[alert.status] = (acc[alert.status] || 0) + 1;
            return acc;
          }, {} as Record<string, number>) || {};

          return { data: counts, error: null };
        });

      if (error) throw error;

      // Check for signals stuck in invalid states
      const { data: stuckSignals, error: stuckError } = await supabase
        .from('trade_alerts')
        .select('id, status, created_at, updated_at')
        .eq('status', 'pending')
        .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Older than 24h

      if (stuckError) throw stuckError;

      return {
        component: 'Signal Status Transitions',
        status: (stuckSignals?.length || 0) > 0 ? 'warning' : 'healthy',
        details: (stuckSignals?.length || 0) > 0 
          ? `${stuckSignals?.length} signals stuck in pending > 24h`
          : 'Signal status transitions working properly',
        metrics: {
          statusDistribution: statusCounts,
          stuckSignals: stuckSignals?.length || 0
        }
      };
    } catch (error) {
      return {
        component: 'Signal Status Transitions',
        status: 'error', 
        details: `Failed to check signal statuses: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async checkPendingLimitActivation(): Promise<HealthCheckResult> {
    try {
      // Get pending limit orders with current market prices
      const { data: pendingWithPrices, error } = await supabase
        .from('trade_alerts')
        .select(`
          id,
          asset_name,
          trade_type,
          entry_price,
          tradermade_symbol,
          created_at
        `)
        .eq('status', 'pending')
        .in('trade_type', ['buy_limit', 'sell_limit']);

      if (error) throw error;

      if (!pendingWithPrices || pendingWithPrices.length === 0) {
        return {
          component: 'Pending Limit Activation',
          status: 'healthy',
          details: 'No pending limit orders to check',
          metrics: {
            totalPendingLimits: 0,
            readyForActivation: 0
          }
        };
      }

      // Get current market prices for these symbols
      const symbols = [...new Set(pendingWithPrices.map(order => order.tradermade_symbol))];
      const { data: marketPrices, error: pricesError } = await supabase
        .from('market_prices')
        .select('symbol, bid, ask, timestamp')
        .in('symbol', symbols);

      if (pricesError) throw pricesError;

      // Check which orders should be activated
      let readyForActivation = 0;
      const pricesMap = new Map();
      marketPrices?.forEach(price => {
        pricesMap.set(price.symbol, price);
      });

      for (const order of pendingWithPrices) {
        const marketPrice = pricesMap.get(order.tradermade_symbol);
        if (marketPrice) {
          const shouldActivate = (
            (order.trade_type === 'buy_limit' && marketPrice.bid <= order.entry_price) ||
            (order.trade_type === 'sell_limit' && marketPrice.ask >= order.entry_price)
          );
          if (shouldActivate) {
            readyForActivation++;
          }
        }
      }

      return {
        component: 'Pending Limit Activation',
        status: readyForActivation > 0 ? 'warning' : 'healthy',
        details: readyForActivation > 0 
          ? `${readyForActivation} pending orders should be activated based on current prices`
          : `All ${pendingWithPrices.length} pending limit orders waiting for price conditions`,
        metrics: {
          totalPendingLimits: pendingWithPrices.length,
          readyForActivation,
          symbolsMonitored: symbols.length,
          pricesAvailable: marketPrices?.length || 0
        }
      };
    } catch (error) {
      return {
        component: 'Pending Limit Activation',
        status: 'error',
        details: `Failed to check pending limit activation: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async checkAllTPsHitButNotClosed(): Promise<HealthCheckResult> {
    try {
      const { data: signals, error } = await supabase
        .from('trade_alerts')
        .select('id, asset_name, status, tp1, tp2, tp3, tp4, tp5, tp_hits, tradermade_symbol')
        .in('status', ['active', 'partially_profited'])
        .not('tp_hits', 'is', null);

      if (error) throw error;

      const problematicSignals = [];
      
      for (const signal of signals || []) {
        // Count total TP levels
        const totalTPs = [signal.tp1, signal.tp2, signal.tp3, signal.tp4, signal.tp5]
          .filter(tp => tp !== null).length;
        
        // Check if all TPs are hit
        const tpHits = signal.tp_hits || [];
        if (tpHits.length >= totalTPs && totalTPs > 0) {
          problematicSignals.push({
            id: signal.id,
            asset: signal.asset_name,
            status: signal.status,
            totalTPs,
            tpHitsCount: tpHits.length,
            tpHits: tpHits
          });
        }
      }

      return {
        component: 'All TPs Hit Check',
        status: problematicSignals.length > 0 ? 'error' : 'healthy',
        details: problematicSignals.length > 0 
          ? `${problematicSignals.length} signals have all TPs hit but are not closed: ${problematicSignals.map(s => s.asset).join(', ')}`
          : 'All signals with TP hits are properly closed',
        metrics: {
          totalSignalsChecked: signals?.length || 0,
          problematicSignals: problematicSignals.length,
          signalDetails: problematicSignals
        }
      };
    } catch (error) {
      return {
        component: 'All TPs Hit Check',
        status: 'error',
        details: `Failed to check TP completion: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async checkNotificationTriggers(): Promise<HealthCheckResult> {
    try {
      // Check recent notification logs
      const { data: recentLogs, error } = await supabase
        .from('cron_job_logs')
        .select('*')
        .eq('job_name', 'auto_notify_price_alerts')
        .order('execution_time', { ascending: false })
        .limit(10);

      if (error) throw error;

      const successfulLogs = recentLogs?.filter(log => log.status === 'success') || [];
      const failedLogs = recentLogs?.filter(log => log.status === 'error') || [];

      return {
        component: 'Notification Triggers',
        status: failedLogs.length > successfulLogs.length ? 'warning' : 'healthy',
        details: `Recent notifications: ${successfulLogs.length} success, ${failedLogs.length} failed`,
        metrics: {
          recentSuccesses: successfulLogs.length,
          recentFailures: failedLogs.length,
          lastExecution: recentLogs?.[0]?.execution_time || 'never'
        }
      };
    } catch (error) {
      return {
        component: 'Notification Triggers',
        status: 'error',
        details: `Failed to check notifications: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async checkDatabaseConsistency(): Promise<HealthCheckResult> {
    try {
      // Check for orphaned alert_monitoring entries using available joins
      const { data: alerts, error } = await supabase
        .from('alert_monitoring')
        .select(`
          id, 
          signal_id, 
          is_active,
          trade_alerts!inner(id, status)
        `)
        .eq('is_active', true);

      if (error) throw error;

      // Find inconsistent alerts (active monitoring for closed signals)
      const inconsistentAlerts = alerts?.filter(alert => 
        alert.trade_alerts?.status === 'closed'
      ) || [];

      // Check for missing monitoring entries for active signals
      const { data: activeSignalsWithoutMonitoring, error: missingError } = await supabase
        .from('trade_alerts')
        .select(`
          id,
          tradermade_symbol,
          status,
          alert_monitoring!left(signal_id)
        `)
        .in('status', ['active', 'partially_profited'])
        .is('alert_monitoring.signal_id', null);

      if (missingError) throw missingError;

      const totalInconsistencies = inconsistentAlerts.length + (activeSignalsWithoutMonitoring?.length || 0);

      return {
        component: 'Database Consistency',
        status: totalInconsistencies > 0 ? 'warning' : 'healthy',
        details: totalInconsistencies > 0 
          ? `${inconsistentAlerts.length} active alerts for closed signals, ${activeSignalsWithoutMonitoring?.length || 0} active signals without monitoring`
          : 'Database consistency maintained',
        metrics: {
          totalActiveAlerts: alerts?.length || 0,
          inconsistentAlerts: inconsistentAlerts.length,
          missingMonitoringEntries: activeSignalsWithoutMonitoring?.length || 0,
          totalInconsistencies
        }
      };
    } catch (error) {
      return {
        component: 'Database Consistency',
        status: 'error',
        details: `Failed to check database consistency: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async generateHealthReport(): Promise<string> {
    const results = await this.runFullHealthCheck();
    
    let report = "# Signal Logic Engine Health Report\n\n";
    report += `Generated: ${new Date().toISOString()}\n\n`;

    const healthy = results.filter(r => r.status === 'healthy').length;
    const warnings = results.filter(r => r.status === 'warning').length; 
    const errors = results.filter(r => r.status === 'error').length;

    report += `## Summary\n`;
    report += `- ✅ Healthy: ${healthy}\n`;
    report += `- ⚠️ Warnings: ${warnings}\n`;
    report += `- ❌ Errors: ${errors}\n\n`;

    report += `## Component Details\n\n`;

    for (const result of results) {
      const icon = result.status === 'healthy' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
      report += `### ${icon} ${result.component}\n`;
      report += `**Status**: ${result.status.toUpperCase()}\n`;
      report += `**Details**: ${result.details}\n`;
      
      if (result.metrics) {
        report += `**Metrics**:\n`;
        for (const [key, value] of Object.entries(result.metrics)) {
          report += `  - ${key}: ${JSON.stringify(value)}\n`;
        }
      }
      report += `\n`;
    }

    return report;
  }
}

// Export singleton instance
export const signalEngineHealthCheck = new SignalEngineHealthCheck();
