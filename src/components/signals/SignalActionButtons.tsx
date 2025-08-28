
import { Button } from '@/components/ui/button';
import { X, StopCircle } from 'lucide-react';
import { useSignalActions } from '@/hooks/useSignalActions';
import { TradeAlertData } from './TradeAlertData';

interface SignalActionButtonsProps {
  signal: TradeAlertData;
  isOwner: boolean;
}

export const SignalActionButtons = ({ signal, isOwner }: SignalActionButtonsProps) => {
  const { closeSignal, cancelOrder, isLoading } = useSignalActions();

  if (!isOwner) return null;

  const handleCloseSignal = async () => {
    if (confirm('Are you sure you want to close this signal?')) {
      await closeSignal(signal.id, 'manual');
    }
  };

  const handleCancelOrder = async () => {
    if (confirm('Are you sure you want to cancel this pending order?')) {
      await cancelOrder(signal.id);
    }
  };

  // Show Cancel button for pending limit orders
  if (signal.status === 'pending' && 
      (signal.trade_type === 'buy_limit' || signal.trade_type === 'sell_limit')) {
    return (
      <Button
        onClick={handleCancelOrder}
        disabled={isLoading}
        size="sm"
        variant="outline"
        className="ml-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
      >
        <X className="w-4 h-4 mr-1" />
        Cancel Order
      </Button>
    );
  }

  // Show Close button for active/partially_profited signals
  if (signal.status === 'active' || signal.status === 'partially_profited') {
    return (
      <Button
        onClick={handleCloseSignal}
        disabled={isLoading}
        size="sm"
        variant="outline"
        className="ml-2 border-orange-200 text-orange-600 hover:bg-orange-50 hover:border-orange-300"
      >
        <StopCircle className="w-4 h-4 mr-1" />
        Close Signal
      </Button>
    );
  }

  return null;
};
