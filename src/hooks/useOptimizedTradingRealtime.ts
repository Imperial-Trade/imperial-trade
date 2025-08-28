import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TradingApiService } from '@/api/services/TradingApiService';
import { TradeAlertWithProfile } from '@/types/trading';

interface UseOptimizedTradingRealtimeProps {
  userId: string;
  showAllSignals: boolean;
  initialFetch?: boolean;
}

export const useOptimizedTradingRealtime = ({ userId, showAllSignals, initialFetch = true }: UseOptimizedTradingRealtimeProps) => {
  const [alerts, setAlerts] = useState<TradeAlertWithProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(false);

  const fetchAlerts = useCallback(async () => {
    if (!userId) {
      setAlerts([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fetchedAlerts = await TradingApiService.getTradeAlertsByUserId(userId);
      if (isMounted.current) {
        setAlerts(fetchedAlerts as TradeAlertWithProfile[]);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch alerts');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [userId]);

  useEffect(() => {
    isMounted.current = true;
    if (initialFetch) {
      fetchAlerts();
    }

    return () => {
      isMounted.current = false;
    };
  }, [fetchAlerts, initialFetch]);

  useEffect(() => {
    if (showAllSignals) {
      fetchAlerts();
    }
  }, [showAllSignals, fetchAlerts]);

  return {
    alerts,
    loading,
    error,
    refreshAlerts: fetchAlerts
  };
};
