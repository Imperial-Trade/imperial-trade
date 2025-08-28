
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { TradingApiService } from '@/api/services/TradingApiService';

interface SignalCreateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const SignalCreateDialog = ({ isOpen, onClose, onSuccess }: SignalCreateDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    assetName: '',
    tradermadeSymbol: '',
    tradeType: 'buy_limit' as 'buy_limit' | 'sell_limit' | 'long' | 'short',
    entryPrice: '',
    stopLoss: '',
    tp1: '',
    tp2: '',
    tp3: '',
    tp4: '',
    tp5: '',
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await TradingApiService.createAlert({
        assetName: formData.assetName,
        tradermadeSymbol: formData.tradermadeSymbol,
        tradeType: formData.tradeType,
        entryPrice: parseFloat(formData.entryPrice),
        stopLoss: parseFloat(formData.stopLoss),
        tp1: formData.tp1 ? parseFloat(formData.tp1) : undefined,
        tp2: formData.tp2 ? parseFloat(formData.tp2) : undefined,
        tp3: formData.tp3 ? parseFloat(formData.tp3) : undefined,
        tp4: formData.tp4 ? parseFloat(formData.tp4) : undefined,
        tp5: formData.tp5 ? parseFloat(formData.tp5) : undefined,
        notes: formData.notes || undefined
      });

      toast.success('Signal created successfully');
      onSuccess();
      setFormData({
        assetName: '',
        tradermadeSymbol: '',
        tradeType: 'buy_limit',
        entryPrice: '',
        stopLoss: '',
        tp1: '',
        tp2: '',
        tp3: '',
        tp4: '',
        tp5: '',
        notes: ''
      });
    } catch (error) {
      console.error('Error creating signal:', error);
      toast.error('Failed to create signal');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Signal</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="assetName">Asset Name</Label>
              <Input
                id="assetName"
                value={formData.assetName}
                onChange={(e) => setFormData(prev => ({ ...prev, assetName: e.target.value }))}
                placeholder="EURUSD"
                required
              />
            </div>
            <div>
              <Label htmlFor="tradermadeSymbol">Symbol</Label>
              <Input
                id="tradermadeSymbol"
                value={formData.tradermadeSymbol}
                onChange={(e) => setFormData(prev => ({ ...prev, tradermadeSymbol: e.target.value }))}
                placeholder="EURUSD"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="tradeType">Trade Type</Label>
            <Select value={formData.tradeType} onValueChange={(value: any) => setFormData(prev => ({ ...prev, tradeType: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="buy_limit">Buy Limit</SelectItem>
                <SelectItem value="sell_limit">Sell Limit</SelectItem>
                <SelectItem value="long">Long (Market)</SelectItem>
                <SelectItem value="short">Short (Market)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="entryPrice">Entry Price</Label>
              <Input
                id="entryPrice"
                type="number"
                step="0.00001"
                value={formData.entryPrice}
                onChange={(e) => setFormData(prev => ({ ...prev, entryPrice: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="stopLoss">Stop Loss</Label>
              <Input
                id="stopLoss"
                type="number"
                step="0.00001"
                value={formData.stopLoss}
                onChange={(e) => setFormData(prev => ({ ...prev, stopLoss: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label htmlFor="tp1">TP1</Label>
              <Input
                id="tp1"
                type="number"
                step="0.00001"
                value={formData.tp1}
                onChange={(e) => setFormData(prev => ({ ...prev, tp1: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="tp2">TP2</Label>
              <Input
                id="tp2"
                type="number"
                step="0.00001"
                value={formData.tp2}
                onChange={(e) => setFormData(prev => ({ ...prev, tp2: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="tp3">TP3</Label>
              <Input
                id="tp3"
                type="number"
                step="0.00001"
                value={formData.tp3}
                onChange={(e) => setFormData(prev => ({ ...prev, tp3: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="tp4">TP4</Label>
              <Input
                id="tp4"
                type="number"
                step="0.00001"
                value={formData.tp4}
                onChange={(e) => setFormData(prev => ({ ...prev, tp4: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="tp5">TP5</Label>
              <Input
                id="tp5"
                type="number"
                step="0.00001"
                value={formData.tp5}
                onChange={(e) => setFormData(prev => ({ ...prev, tp5: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Optional trading notes..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? 'Creating...' : 'Create Signal'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
