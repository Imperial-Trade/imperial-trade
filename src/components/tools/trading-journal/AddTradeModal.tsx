import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Zap } from 'lucide-react';
import { Trade } from './types';
import { useToast } from '@/hooks/use-toast';

interface AddTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  newTrade: Partial<Trade>;
  onTradeChange: (trade: Partial<Trade>) => void;
  onSave: () => void;
}

export const AddTradeModal: React.FC<AddTradeModalProps> = ({
  isOpen,
  onClose,
  newTrade,
  onTradeChange,
  onSave
}) => {
  const { toast } = useToast();

  const handleSave = () => {
    onSave();
    toast({
      title: "Trade Saved",
      description: "Your trade has been logged successfully",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Log New Trade
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="asset">Asset</Label>
              <Input
                id="asset"
                placeholder="e.g., EURUSD"
                value={newTrade.asset || ''}
                onChange={(e) => onTradeChange({ ...newTrade, asset: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="pnl">P&L ($)</Label>
              <Input
                id="pnl"
                type="number"
                step="0.01"
                placeholder="150.00"
                value={newTrade.pnl || ''}
                onChange={(e) => onTradeChange({ ...newTrade, pnl: parseFloat(e.target.value) })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!newTrade.asset || newTrade.pnl === undefined}
            >
              <Zap className="h-4 w-4 mr-2" />
              Save Trade
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};