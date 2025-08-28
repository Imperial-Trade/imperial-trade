
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PendingOrderStats {
  totalPending: number;
  recentlyActivated: number;
  averageWaitTime: number;
  healthStatus: 'healthy' | 'warning' | 'error';
}

export const usePendingOrderMonitor = () => {
  const [stats, setStats] = useState<PendingOrderStats>({
    totalPending: 0,
    recentlyActivated: 0,
    averageWaitTime: 0,
    healthStatus: 'healthy'
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setError(null);
      
      // Get pending orders count
      const { data: pendingData, error: pendingError } = await supabase
        .from('trade_alerts')
        .select('id, created_at')
        .in('trade_type', ['buy_limit', 'sell_limit'])
        .eq('status', 'pending');

      if (pendingError) throw pendingError;

      // Get recently activated orders (last 24 hours)
      const { data: activatedData, error: activatedError } = await supabase
        .from('trade_alerts')
        .select('activated_at, created_at')
        .in('trade_type', ['buy_limit', 'sell_limit'])
        .eq('status', 'active')
        .not('activated_at', 'is', null)
        .gte('activated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (activatedError) throw activatedError;

      // Calculate average wait time for activated orders
      let averageWaitTime = 0;
      if (activatedData && activatedData.length > 0) {
        const totalWaitTime = activatedData.reduce((sum, order) => {
          const waitTime = new Date(order.activated_at).getTime() - new Date(order.created_at).getTime();
          return sum + waitTime;
        }, 0);
        averageWaitTime = totalWaitTime / activatedData.length / (1000 * 60); // Convert to minutes
      }

      // Determine health status
      let healthStatus: 'healthy' | 'warning' | 'error' = 'healthy';
      const pendingCount = pendingData?.length || 0;
      
      // Check for potential issues
      if (pendingCount > 50) {
        healthStatus = 'warning'; // Many pending orders might indicate processing issues
      }
      
      // Check if very old pending orders exist (over 24 hours)
      const oldPending = pendingData?.filter(order => {
        const ageHours = (Date.now() - new Date(order.created_at).getTime()) / (1000 * 60 * 60);
        return ageHours > 24;
      });
      
      if (oldPending && oldPending.length > 0) {
        healthStatus = 'error'; // Old pending orders indicate system problems
      }

      setStats({
        totalPending: pendingCount,
        recentlyActivated: activatedData?.length || 0,
        averageWaitTime: Math.round(averageWaitTime),
        healthStatus
      });

    } catch (err: any) {
      console.error('Error fetching pending order stats:', err);
      setError(err.message);
      setStats(prev => ({ ...prev, healthStatus: 'error' }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    
    // Set up real-time subscription for pending order changes
    const channel = supabase
      .channel('pending-orders-monitor')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trade_alerts',
          filter: 'trade_type=in.(buy_limit,sell_limit)'
        },
        () => {
          // Refresh stats when limit orders change
          fetchStats();
        }
      )
      .subscribe();

    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refresh: fetchStats
  };
};
