import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Clock, Zap, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useMonitoringRouteGate } from '@/hooks/useMonitoringRouteGate';
import { getTimeAgo } from '@/utils/timeUtils';

interface SystemHealthMonitorProps {
  className?: string;
}

interface HealthMetrics {
  priceUpdatesActive: boolean;
  orderMonitorActive: boolean;
  lastPriceUpdate: string | null;
  lastOrderCheck: string | null;
  cronJobsHealthy: boolean;
}

export const SystemHealthMonitor: React.FC<SystemHealthMonitorProps> = ({ className = "" }) => {
  const { shouldEnableMonitoring, currentRoute } = useMonitoringRouteGate();
  
  const [health, setHealth] = useState<HealthMetrics>({
    priceUpdatesActive: false,
    orderMonitorActive: false,
    lastPriceUpdate: null,
    lastOrderCheck: null,
    cronJobsHealthy: false
  });

  useEffect(() => {
    const checkSystemHealth = async () => {
      try {
        // Check recent price updates
        const { data: recentPrices } = await supabase
          .from('market_prices')
          .select('updated_at')
          .order('updated_at', { ascending: false })
          .limit(1);

        // Check cron job logs
        const { data: cronLogs } = await supabase
          .from('cron_job_logs')
          .select('job_name, execution_time, status')
          .order('execution_time', { ascending: false })
          .limit(10);

        const now = new Date();
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

        // Check if price updates are recent (within 10 seconds)
        const priceUpdatesActive = recentPrices && recentPrices[0] && 
          new Date(recentPrices[0].updated_at) > new Date(now.getTime() - 10000);

        // Check if any recent cron jobs ran successfully
        const recentSuccessfulJobs = cronLogs?.filter(log => 
          new Date(log.execution_time) > fiveMinutesAgo && log.status === 'success'
        ) || [];

        setHealth({
          priceUpdatesActive: !!priceUpdatesActive,
          orderMonitorActive: recentSuccessfulJobs.some(job => job.job_name?.includes('order')),
          lastPriceUpdate: recentPrices?.[0]?.updated_at || null,
          lastOrderCheck: cronLogs?.find(log => log.job_name?.includes('order'))?.execution_time || null,
          cronJobsHealthy: recentSuccessfulJobs.length > 0
        });

      } catch (error) {
        console.error('Failed to check system health:', error);
      }
    };

    // Initial check
    checkSystemHealth();

    // Check every 30 seconds
    const interval = setInterval(checkSystemHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const getOverallStatus = (): 'healthy' | 'warning' | 'error' => {
    if (health.priceUpdatesActive && health.orderMonitorActive && health.cronJobsHealthy) {
      return 'healthy';
    }
    if (health.priceUpdatesActive || health.cronJobsHealthy) {
      return 'warning';
    }
    return 'error';
  };

  const overallStatus = getOverallStatus();

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Activity className="h-4 w-4" />
          System Health
          <Badge 
            variant={overallStatus === 'healthy' ? 'default' : overallStatus === 'warning' ? 'secondary' : 'destructive'}
            className="ml-auto"
          >
            {overallStatus === 'healthy' && <CheckCircle className="h-3 w-3 mr-1" />}
            {overallStatus === 'warning' && <AlertCircle className="h-3 w-3 mr-1" />}
            {overallStatus === 'error' && <AlertCircle className="h-3 w-3 mr-1" />}
            {overallStatus.charAt(0).toUpperCase() + overallStatus.slice(1)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Zap className="h-3 w-3" />
            Price Updates
          </div>
          <div className="flex items-center gap-1">
            <Badge 
              variant={health.priceUpdatesActive ? 'default' : 'destructive'} 
              className="text-xs px-1 py-0"
            >
              {health.priceUpdatesActive ? 'Live' : 'Stale'}
            </Badge>
            <span className="text-muted-foreground">
              {getTimeAgo(health.lastPriceUpdate)}
            </span>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3" />
            Order Monitor
          </div>
          <div className="flex items-center gap-1">
            <Badge 
              variant={health.orderMonitorActive ? 'default' : 'secondary'} 
              className="text-xs px-1 py-0"
            >
              {health.orderMonitorActive ? 'Active' : 'Idle'}
            </Badge>
            <span className="text-muted-foreground">
              {getTimeAgo(health.lastOrderCheck)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Activity className="h-3 w-3" />
            Automation
          </div>
          <Badge 
            variant={health.cronJobsHealthy ? 'default' : 'destructive'} 
            className="text-xs px-1 py-0"
          >
            {health.cronJobsHealthy ? 'Running' : 'Issues'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};