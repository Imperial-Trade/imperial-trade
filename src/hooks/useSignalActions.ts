
import { useState } from 'react';
import { toast } from 'sonner';
import { UpdateTradeAlertDto } from '@/domain/dtos/trading/CreateTradeAlertDto';

export interface UseSignalActionsProps {
  updateAlert: (id: string, dto: UpdateTradeAlertDto) => Promise<any>;
  deleteAlert: (id: string) => Promise<boolean>;
}

export const useSignalActions = ({ updateAlert, deleteAlert }: UseSignalActionsProps) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCloseSignal = async (id: string, reason: 'manual' | 'stop_loss' | 'tp1' | 'tp2' | 'tp3' | 'tp4' | 'tp5' | 'reversal_after_tp' | 'all_tps_hit') => {
    setIsProcessing(true);
    try {
      await updateAlert(id, {
        status: 'closed',
        closeReason: reason
      });
      toast.success('Signal closed successfully', { duration: 5000 });
    } catch (error) {
      console.error('Error closing signal:', error);
      toast.error('Failed to close signal', { duration: 5000 });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelSignal = async (id: string) => {
    setIsProcessing(true);
    try {
      await updateAlert(id, {
        status: 'cancelled'
      });
      toast.success('Signal cancelled successfully', { duration: 5000 });
    } catch (error) {
      console.error('Error cancelling signal:', error);
      toast.error('Failed to cancel signal', { duration: 5000 });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteSignal = async (id: string) => {
    setIsProcessing(true);
    try {
      const success = await deleteAlert(id);
      if (success) {
        toast.success('Signal deleted successfully', { duration: 5000 });
      } else {
        toast.error('Failed to delete signal', { duration: 5000 });
      }
    } catch (error) {
      console.error('Error deleting signal:', error);
      toast.error('Failed to delete signal', { duration: 5000 });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleHitTakeProfit = async (id: string, tpLevel: number, currentTpHits: number[]) => {
    setIsProcessing(true);
    try {
      const newTpHits = [...new Set([...currentTpHits, tpLevel])];
      await updateAlert(id, {
        tpHits: newTpHits
      });
      toast.success(`TP${tpLevel} hit recorded`, { duration: 5000 });
    } catch (error) {
      console.error('Error recording TP hit:', error);
      toast.error('Failed to record TP hit', { duration: 5000 });
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    handleCloseSignal,
    handleCancelSignal,
    handleDeleteSignal,
    handleHitTakeProfit,
    isProcessing
  };
};
