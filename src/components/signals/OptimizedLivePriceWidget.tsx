import React, { memo, useCallback, useMemo } from 'react';
import { useOptimizedLivePrice } from '@/hooks/useOptimizedLivePrice';
import { useThrottledPrice } from '@/hooks/useThrottledPrice';
import { useSignalPermissions } from '@/hooks/useSignalPermissions';
import { PermissionGate } from './PermissionGate';
import { LivePriceWidget } from './LivePriceWidget';

interface OptimizedLivePriceWidgetProps {
  alert: any;
  onTakeProfitHit?: (alert: any, hits: number[], shouldClose: boolean, reason: string) => Promise<void>;
  onStopLossHit?: (alert: any, reason: string) => Promise<void>;
  onOrderActivation?: (alert: any) => Promise<void>;
}

const OptimizedLivePriceWidgetComponent: React.FC<OptimizedLivePriceWidgetProps> = ({
  alert,
  onTakeProfitHit,
  onStopLossHit,
  onOrderActivation
}) => {
  const { canEditSignal, validateAction } = useSignalPermissions();
  
  // Check if user can edit this specific signal
  const userCanEdit = useMemo(() => {
    return canEditSignal(alert.creator?.id || alert.userId);
  }, [canEditSignal, alert.creator?.id, alert.userId]);

  // Wrapped callbacks with permission validation
  const protectedTakeProfitHit = useCallback(async (
    alertData: any, 
    hits: number[], 
    shouldClose: boolean, 
    reason: string
  ) => {
    if (!validateAction(alertData.creator?.id || alertData.userId, 'update TP hits')) {
      return;
    }
    if (onTakeProfitHit) {
      await onTakeProfitHit(alertData, hits, shouldClose, reason);
    }
  }, [onTakeProfitHit, validateAction]);

  const protectedStopLossHit = useCallback(async (alertData: any, reason: string) => {
    if (!validateAction(alertData.creator?.id || alertData.userId, 'trigger stop loss')) {
      return;
    }
    if (onStopLossHit) {
      await onStopLossHit(alertData, reason);
    }
  }, [onStopLossHit, validateAction]);

  const protectedOrderActivation = useCallback(async (alertData: any) => {
    if (!validateAction(alertData.creator?.id || alertData.userId, 'activate order')) {
      return;
    }
    if (onOrderActivation) {
      await onOrderActivation(alertData);
    }
  }, [onOrderActivation, validateAction]);

  const handleUnauthorized = useCallback(() => {
    console.warn('[UNAUTHORIZED] User attempted to interact with signal they cannot edit');
  }, []);

  // Only render if user has read access (everyone can see prices)
  return (
    <PermissionGate
      userCanEdit={true} // Everyone can see live prices
      onUnauthorized={handleUnauthorized}
    >
      <LivePriceWidget
        alert={alert}
        onTakeProfitHit={userCanEdit ? protectedTakeProfitHit : undefined}
        onStopLossHit={userCanEdit ? protectedStopLossHit : undefined}
        onOrderActivation={userCanEdit ? protectedOrderActivation : undefined}
      />
    </PermissionGate>
  );
};

export const OptimizedLivePriceWidget = memo(OptimizedLivePriceWidgetComponent);