import { useCallback, useRef } from 'react';
import { UpdateTradeAlertDto } from '@/domain/dtos/trading/CreateTradeAlertDto';
import { useSignalPermissions } from './useSignalPermissions';

interface UseStabilizedSignalOperationsProps {
  updateAlert: (id: string, dto: UpdateTradeAlertDto) => Promise<any>;
  addNotification?: (notification: any) => void;
}

export const useStabilizedSignalOperations = ({
  updateAlert,
  addNotification
}: UseStabilizedSignalOperationsProps) => {
  const { validateAction } = useSignalPermissions();
  const updateInProgress = useRef(new Set<string>());

  const handleStatusUpdate = useCallback(async (alert: any, newStatus: string) => {
    if (updateInProgress.current.has(alert.id)) {
      console.log(`[SKIP] Status update already in progress for ${alert.id}`);
      return false;
    }

    if (!validateAction(alert.creator?.id, `update status to ${newStatus}`)) {
      addNotification?.({
        type: 'error',
        title: 'Access Denied',
        message: 'You can only modify your own signals'
      });
      return false;
    }

    updateInProgress.current.add(alert.id);
    
    try {
      const updateDto: UpdateTradeAlertDto = {
        status: newStatus as 'pending' | 'active' | 'closed',
        closeReason: newStatus === 'closed' ? 'manual' : undefined
      };
      
      const result = await updateAlert(alert.id, updateDto);
      
      if (result && newStatus === 'closed') {
        addNotification?.({
          type: 'trade_closed',
          title: `🔒 Signal Closed`,
          message: `${alert.assetName} signal has been closed`
        });
      }
      
      return result;
    } catch (error) {
      console.error(`[ERROR] Failed to update status for ${alert.id}:`, error);
      addNotification?.({
        type: 'error',
        title: 'Update Failed',
        message: 'Could not update signal status. Please try again.'
      });
      return false;
    } finally {
      updateInProgress.current.delete(alert.id);
    }
  }, [updateAlert, validateAction, addNotification]);

  const handleTakeProfitHit = useCallback(async (
    alert: any, 
    newTPHits: number[], 
    shouldAutoClose = false, 
    closeReason: string | null = null
  ) => {
    if (updateInProgress.current.has(alert.id)) {
      console.log(`[SKIP] TP update already in progress for ${alert.id}`);
      return false;
    }

    if (!validateAction(alert.creator?.id, 'update TP hits')) {
      return false;
    }

    updateInProgress.current.add(alert.id);
    
    try {
      let typedCloseReason: 'manual' | 'stop_loss' | 'tp1' | 'tp2' | 'tp3' | 'tp4' | 'tp5' | 'reversal_after_tp' | undefined = undefined;
      
      if (shouldAutoClose && closeReason) {
        const validReasons = ['manual', 'stop_loss', 'tp1', 'tp2', 'tp3', 'tp4', 'tp5', 'reversal_after_tp'];
        typedCloseReason = validReasons.includes(closeReason) ? closeReason as any : 'manual';
      }

      const updateDto: UpdateTradeAlertDto = {
        tpHits: newTPHits,
        ...(shouldAutoClose && {
          status: 'closed',
          closeReason: typedCloseReason
        })
      };

      const result = await updateAlert(alert.id, updateDto);
      
      if (result) {
        const highestTP = newTPHits.length > 0 ? Math.max(...newTPHits) : null;
        if (highestTP !== null) {
          addNotification?.({
            type: 'tp_hit',
            title: `🎯 TP${highestTP} Hit!`,
            message: `${alert.assetName} reached Take Profit ${highestTP}`
          });
        }
      }
      
      return result;
    } catch (error) {
      console.error(`[ERROR] Failed to update TP hits for ${alert.id}:`, error);
      return false;
    } finally {
      updateInProgress.current.delete(alert.id);
    }
  }, [updateAlert, validateAction, addNotification]);

  const handleStopLossHit = useCallback(async (alert: any, closeReason: string) => {
    if (updateInProgress.current.has(alert.id)) {
      console.log(`[SKIP] Stop loss update already in progress for ${alert.id}`);
      return false;
    }

    if (!validateAction(alert.creator?.id, 'trigger stop loss')) {
      return false;
    }

    updateInProgress.current.add(alert.id);
    
    try {
      const validReasons = ['manual', 'stop_loss', 'tp1', 'tp2', 'tp3', 'tp4', 'tp5', 'reversal_after_tp'];
      const typedCloseReason = validReasons.includes(closeReason) ? closeReason as any : 'stop_loss';

      const updateDto: UpdateTradeAlertDto = {
        status: 'closed',
        closeReason: typedCloseReason
      };

      const result = await updateAlert(alert.id, updateDto);
      
      if (result) {
        addNotification?.({
          type: 'stop_loss',
          title: `🚨 Stop Loss Hit!`,
          message: `${alert.assetName} trade closed at stop loss`
        });
      }
      
      return result;
    } catch (error) {
      console.error(`[ERROR] Failed to update stop loss for ${alert.id}:`, error);
      return false;
    } finally {
      updateInProgress.current.delete(alert.id);
    }
  }, [updateAlert, validateAction, addNotification]);

  const handleOrderActivation = useCallback(async (alert: any) => {
    if (updateInProgress.current.has(alert.id)) {
      console.log(`[SKIP] Order activation already in progress for ${alert.id}`);
      return false;
    }

    if (!validateAction(alert.creator?.id, 'activate order')) {
      return false;
    }

    updateInProgress.current.add(alert.id);
    
    try {
      const updateDto: UpdateTradeAlertDto = {
        status: 'active'
      };

      const result = await updateAlert(alert.id, updateDto);
      
      if (result) {
        addNotification?.({
          type: 'trade_activated',
          title: `🚀 Order Activated!`,
          message: `${alert.assetName} ${alert.tradeType} is now active`
        });
      }
      
      return result;
    } catch (error) {
      console.error(`[ERROR] Failed to activate order for ${alert.id}:`, error);
      return false;
    } finally {
      updateInProgress.current.delete(alert.id);
    }
  }, [updateAlert, validateAction, addNotification]);

  return {
    handleStatusUpdate,
    handleTakeProfitHit,
    handleStopLossHit,
    handleOrderActivation,
    isUpdateInProgress: (alertId: string) => updateInProgress.current.has(alertId)
  };
};