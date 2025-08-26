
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
      // Check for orphaned alert_monitoring entries
      const { data: orphanedAlerts, error: orphanError } = await supabase
        .rpc('check_orphaned_alerts'); // This would need to be a custom function

      // For now, do a simpler check
      const { data: alerts, error } = await supabase
        .from('alert_monitoring')
        .select(`
          id, 
          signal_id, 
          trade_alerts!inner(id, status)
        `)
        .eq('is_active', true);

      if (error) throw error;

      const inconsistentAlerts = alerts?.filter(alert => 
        alert.trade_alerts?.status === 'closed'
      ) || [];

      return {
        component: 'Database Consistency',
        status: inconsistentAlerts.length > 0 ? 'warning' : 'healthy',
        details: inconsistentAlerts.length > 0 
          ? `${inconsistentAlerts.length} active alerts for closed signals`
          : 'Database consistency maintained',
        metrics: {
          totalActiveAlerts: alerts?.length || 0,
          inconsistentAlerts: inconsistentAlerts.length
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
