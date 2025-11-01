import { useState, useEffect, useCallback } from 'react';
import { notificationValidator } from '@/utils/notificationValidation';
import { supabase } from '@/integrations/supabase/client';

interface NotificationHealth {
  isHealthy: boolean;
  successRate: number;
  falsePositiveRate: number;
  avgResponseTime: number;
  lastError: string | null;
  totalSent24h: number;
  issues: string[];
}

interface NotificationMetrics {
  sent: number;
  delivered: number;
  failed: number;
  falsePositives: number;
}

export const useNotificationHealth = (autoRefresh = true) => {
  const [health, setHealth] = useState<NotificationHealth>({
    isHealthy: true,
    successRate: 100,
    falsePositiveRate: 0,
    avgResponseTime: 0,
    lastError: null,
    totalSent24h: 0,
    issues: []
  });
  const [metrics, setMetrics] = useState<NotificationMetrics>({
    sent: 0,
    delivered: 0,
    failed: 0,
    falsePositives: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const calculateHealth = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Perform comprehensive health check
      const healthCheck = await notificationValidator.performHealthCheck();
      
      // Get recent metrics
      const { data: recentLogs, error: logsError } = await supabase
        .from('cron_job_logs')
        .select('status, records_affected, error_message, created_at')
        .eq('job_name', 'enhanced_notification_pipeline')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (logsError) throw logsError;

      // Get false positive count
      const { data: falsePositives, error: fpError } = await supabase
        .from('notification_audit_false_positives')
        .select('id')
        .gte('false_positive_detected_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (fpError) throw fpError;

      // Calculate metrics
      const logs = recentLogs || [];
      const successfulLogs = logs.filter(log => log.status === 'success');
      const failedLogs = logs.filter(log => log.status === 'error' || log.status === 'critical_error');
      const skippedLogs = logs.filter(log => log.status.startsWith('skipped_'));
      
      const totalSent = successfulLogs.reduce((sum, log) => sum + (log.records_affected || 0), 0);
      const successRate = logs.length > 0 ? (successfulLogs.length / logs.length) * 100 : 100;
      const falsePositiveRate = totalSent > 0 ? ((falsePositives?.length || 0) / totalSent) * 100 : 0;
      
      // Get last error
      const lastErrorLog = failedLogs[0];
      const lastError = lastErrorLog?.error_message || null;

      // Update health state
      setHealth({
        isHealthy: healthCheck.healthy,
        successRate: successRate,
        falsePositiveRate: falsePositiveRate,
        avgResponseTime: healthCheck.metrics.avgResponseTime,
        lastError: lastError,
        totalSent24h: totalSent,
        issues: healthCheck.issues
      });

      // Update metrics
      setMetrics({
        sent: successfulLogs.length,
        delivered: totalSent,
        failed: failedLogs.length,
        falsePositives: falsePositives?.length || 0
      });

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to calculate notification health:', error);
      setHealth(prev => ({
        ...prev,
        isHealthy: false,
        issues: [...prev.issues, 'Health check failed']
      }));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearFalsePositives = useCallback(async () => {
    try {
      const { error } = await supabase
        .from('notification_audit_false_positives')
        .delete()
        .lt('false_positive_detected_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;
      
      // Refresh health after cleanup
      await calculateHealth();
      return true;
    } catch (error) {
      console.error('Failed to clear false positives:', error);
      return false;
    }
  }, [calculateHealth]);

  const reportManualFalsePositive = useCallback(async (signalId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('notification_audit_false_positives')
        .insert({
          signal_id: signalId,
          reported_change_types: ['manual_report'],
          actual_change_data: { reason, manual: true },
          notification_sent_at: new Date().toISOString(),
          detection_method: 'manual_report',
          user_reported: true
        });

      if (error) throw error;
      
      // Refresh metrics
      await calculateHealth();
      return true;
    } catch (error) {
      console.error('Failed to report false positive:', error);
      return false;
    }
  }, [calculateHealth]);

  const getHealthStatus = useCallback(() => {
    if (!health.isHealthy) return 'critical';
    if (health.falsePositiveRate > 2 || health.successRate < 95) return 'warning';
    if (health.successRate < 98) return 'caution';
    return 'healthy';
  }, [health]);

  const getHealthColor = useCallback(() => {
    const status = getHealthStatus();
    switch (status) {
      case 'critical': return 'text-red-500';
      case 'warning': return 'text-yellow-500';
      case 'caution': return 'text-orange-500';
      case 'healthy': return 'text-green-500';
      default: return 'text-gray-500';
    }
  }, [getHealthStatus]);

  // Real-time monitoring subscription
  useEffect(() => {
    if (!autoRefresh) return;

    // Initial load
    calculateHealth();

    // Set up real-time subscription for new logs
    const channel = supabase
      .channel('notification-health-monitor')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cron_job_logs',
          filter: 'job_name=eq.enhanced_notification_pipeline'
        },
        () => {
          // Debounced health recalculation
          setTimeout(calculateHealth, 1000);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notification_audit_false_positives'
        },
        () => {
          setTimeout(calculateHealth, 1000);
        }
      )
      .subscribe();

    // Periodic refresh (every 5 minutes)
    const interval = setInterval(calculateHealth, 5 * 60 * 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [autoRefresh, calculateHealth]);

  return {
    health,
    metrics,
    isLoading,
    lastUpdated,
    refreshHealth: calculateHealth,
    clearFalsePositives,
    reportManualFalsePositive,
    getHealthStatus,
    getHealthColor
  };
};