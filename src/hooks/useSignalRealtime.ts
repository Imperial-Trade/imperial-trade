import { useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { UpdateTradeAlertDto, TradeAlertResponseDto } from '@/domain/dtos/trading/CreateTradeAlertDto';
import { ConnectionStatus } from '@/store/signalStore';
import { TradeAlertWithProfile } from '@/api/services/TradingApiService';
import { useNewSignalStore, enableSignalRealtime } from '@/utils/featureFlags';
import { useSignalStore } from '@/hooks/useSignalStore';
import { realtimeIntegration } from '@/store/realtimeIntegration';

export interface UseSignalRealtimeReturn {
  alerts: TradeAlertWithProfile[];
  isLoading: boolean;
  error: string | null;
  connectionStatus: ConnectionStatus;
  nextRetryAt: number | null;
  updateAlert: (id: string, dto: UpdateTradeAlertDto) => Promise<TradeAlertResponseDto | null>;
  refreshAlerts: () => Promise<void>;
  lastUpdated: Date | null;
}

export const useSignalRealtime = (userId: string, showAllSignals: boolean = false): UseSignalRealtimeReturn => {
  // Check if we should use the new signal store
  const shouldUseNewStore = useNewSignalStore();
  const realtimeEnabled = enableSignalRealtime();
  
  console.log('🚀 useSignalRealtime called - shouldUseNewStore:', shouldUseNewStore, 'realtimeEnabled:', realtimeEnabled, 'userId:', userId);
  
  // NEW STORE IMPLEMENTATION
  if (shouldUseNewStore) {
    console.log('🆕 Using new Zustand signal store');
    
    const storeData = useSignalStore(userId);
    
    console.log('📊 Store data:', {
      alertsCount: storeData.alerts?.length || 0,
      isLoading: storeData.isLoading,
      connectionStatus: storeData.connectionStatus,
      error: storeData.error
    });
    
    // Initialize connection based on realtime flag
    useEffect(() => {
      if (userId) {
        if (realtimeEnabled) {
          console.log('🔗 Initializing real-time connection for user:', userId);
          realtimeIntegration.connect(userId);
          
          return () => {
            console.log('🔌 Cleaning up real-time connection');
            realtimeIntegration.disconnect();
          };
        } else {
          console.log('🚫 Real-time disabled - performing initial data fetch only');
          // Perform initial data fetch without real-time subscription
          storeData.refreshAlerts(userId);
        }
      }
    }, [userId, realtimeEnabled, storeData.refreshAlerts]);
    
    // Exact API compatibility with legacy hook - hide userId from component interface
    const updateAlert = useCallback(
      async (id: string, dto: UpdateTradeAlertDto): Promise<TradeAlertResponseDto | null> => {
        console.log('🔄 New Store - updateAlert called:', { id, dto });
        return storeData.updateAlert(id, dto, userId);
      },
      [storeData.updateAlert, userId]
    );
    
    const refreshAlerts = useCallback(
      async (): Promise<void> => {
        console.log('🔄 New Store - refreshAlerts called');
        await storeData.refreshAlerts(userId);
      },
      [storeData.refreshAlerts, userId]
    );
    
    return {
      alerts: storeData.alerts,
      isLoading: storeData.isLoading,
      error: storeData.error,
      connectionStatus: storeData.connectionStatus,
      nextRetryAt: storeData.nextRetryAt,
      updateAlert,
      refreshAlerts,
      lastUpdated: storeData.lastUpdated,
    };
  }
  
  
  // LEGACY CONTEXT IMPLEMENTATION - Fallback to basic implementation
  console.log('🔄 Using legacy fallback implementation');
  
  const [alerts] = useState<TradeAlertWithProfile[]>([]);
  const [isLoading] = useState(false);
  const [error] = useState<string | null>(null);
  const [connectionStatus] = useState<ConnectionStatus>('disconnected');
  const [nextRetryAt] = useState<number | null>(null);
  const [lastUpdated] = useState<Date | null>(null);

  const updateAlert = useCallback(async (id: string, dto: UpdateTradeAlertDto): Promise<TradeAlertResponseDto | null> => {
    console.warn('Legacy fallback - updateAlert not implemented');
    return null;
  }, []);

  const refreshAlerts = useCallback(async (): Promise<void> => {
    console.warn('Legacy fallback - refreshAlerts not implemented');
  }, []);

  return useMemo(() => ({
    alerts,
    isLoading,
    error,
    connectionStatus,
    nextRetryAt,
    updateAlert,
    refreshAlerts,
    lastUpdated,
  }), [
    alerts,
    isLoading,
    error,
    connectionStatus,
    nextRetryAt,
    updateAlert,
    refreshAlerts,
    lastUpdated,
  ]);
};

// Helper hook for components that only need to read signals without real-time updates
export const useSignalData = (userId: string) => {
  const { alerts, isLoading, error } = useSignalRealtime(userId);
  
  return useMemo(() => ({
    alerts,
    isLoading,
    error,
    // Convenience accessors
    activeAlerts: alerts.filter(alert => alert.status === 'active'),
    closedAlerts: alerts.filter(alert => alert.status === 'closed'),
    pendingAlerts: alerts.filter(alert => alert.status === 'pending'),
  }), [alerts, isLoading, error]);
};

// Helper hook for getting a specific signal by ID
export const useSignalById = (userId: string, signalId: string | null) => {
  const { alerts, isLoading, error } = useSignalRealtime(userId);
  
  const signal = useMemo(() => {
    if (!signalId) return null;
    return alerts.find(alert => alert.id === signalId) || null;
  }, [alerts, signalId]);
  
  return useMemo(() => ({
    signal,
    isLoading,
    error,
    exists: signal !== null,
  }), [signal, isLoading, error]);
};

// Helper hook for filtering signals by status
export const useSignalsByStatus = (userId: string, status: 'active' | 'closed' | 'pending' | 'partially_profited') => {
  const { alerts, isLoading, error } = useSignalRealtime(userId);
  
  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => alert.status === status);
  }, [alerts, status]);
  
  return useMemo(() => ({
    alerts: filteredAlerts,
    count: filteredAlerts.length,
    isLoading,
    error,
  }), [filteredAlerts, isLoading, error]);
};

// Helper hook for getting signal statistics
export const useSignalStats = (userId: string) => {
  const { alerts, isLoading, error } = useSignalRealtime(userId);
  
  const stats = useMemo(() => {
    const active = alerts.filter(alert => alert.status === 'active').length;
    const closed = alerts.filter(alert => alert.status === 'closed').length;
    const pending = alerts.filter(alert => alert.status === 'pending').length;
    const partiallyProfited = alerts.filter(alert => alert.status === 'partially_profited').length;
    
    return {
      total: alerts.length,
      active,
      closed,
      pending,
      partiallyProfited,
      successRate: closed > 0 ? Math.round((partiallyProfited / closed) * 100) : 0,
    };
  }, [alerts]);
  
  return useMemo(() => ({
    ...stats,
    isLoading,
    error,
  }), [stats, isLoading, error]);
};
