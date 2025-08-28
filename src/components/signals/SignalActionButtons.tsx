
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, X, Target, Trash2 } from 'lucide-react';
import { useSignalActions } from '@/hooks/useSignalActions';

interface SignalActionButtonsProps {
  signal: {
    id: string;
    status: 'pending' | 'active' | 'closed' | 'partially_profited' | 'cancelled';
    tpHits: number[];
    tp1?: number;
    tp2?: number;
    tp3?: number;
    tp4?: number;
    tp5?: number;
  };
  updateAlert: (id: string, dto: any) => Promise<any>;
  deleteAlert: (id: string) => Promise<boolean>;
  currentUserRole?: string;
  isCreator?: boolean;
}

export const SignalActionButtons = ({ 
  signal, 
  updateAlert, 
  deleteAlert, 
  currentUserRole,
  isCreator = false 
}: SignalActionButtonsProps) => {
  const { 
    handleCloseSignal, 
    handleCancelSignal, 
    handleDeleteSignal, 
    handleHitTakeProfit, 
    isProcessing 
  } = useSignalActions({ updateAlert, deleteAlert });

  const canManageSignal = isCreator || currentUserRole === 'admin' || currentUserRole === 'moderator';
  
  if (!canManageSignal) {
    return null;
  }

  const availableTPs = [
    { level: 1, price: signal.tp1 },
    { level: 2, price: signal.tp2 },
    { level: 3, price: signal.tp3 },
    { level: 4, price: signal.tp4 },
    { level: 5, price: signal.tp5 }
  ].filter(tp => tp.price);

  const unhitTPs = availableTPs.filter(tp => !signal.tpHits.includes(tp.level));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" disabled={isProcessing}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {signal.status === 'pending' && (
          <>
            <DropdownMenuItem 
              onClick={() => handleCancelSignal(signal.id)}
              className="text-destructive"
            >
              <X className="mr-2 h-4 w-4" />
              Cancel Order
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {(signal.status === 'active' || signal.status === 'partially_profited') && (
          <>
            {unhitTPs.map(tp => (
              <DropdownMenuItem 
                key={tp.level}
                onClick={() => handleHitTakeProfit(signal.id, tp.level, signal.tpHits)}
              >
                <Target className="mr-2 h-4 w-4" />
                Hit TP{tp.level} (${tp.price})
              </DropdownMenuItem>
            ))}
            {unhitTPs.length > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem 
              onClick={() => handleCloseSignal(signal.id, 'manual')}
              className="text-destructive"
            >
              <X className="mr-2 h-4 w-4" />
              Close Signal
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {(signal.status === 'closed' || signal.status === 'cancelled') && (
          <DropdownMenuItem 
            onClick={() => handleDeleteSignal(signal.id)}
            className="text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Signal
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
