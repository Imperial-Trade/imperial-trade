import React, { useState, useCallback } from 'react';
import { useOptimizedTradeAlertForm, type TradeAlertSubmissionData } from '@/hooks/useOptimizedTradeAlertForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface OptimizedNewAlertFormProps {
  onSubmit: (data: TradeAlertSubmissionData) => Promise<void>;
  onCancel?: () => void;
}

const OptimizedNewAlertForm: React.FC<OptimizedNewAlertFormProps> = ({ onSubmit, onCancel }) => {
  const { handleSubmit, isSubmitting } = useOptimizedTradeAlertForm();
  const [assetName, setAssetName] = useState('');
  const [tradermadeSymbol, setTradermadeSymbol] = useState('');
  const [tradeType, setTradeType] = useState<'buy' | 'sell' | 'buy_limit' | 'sell_limit'>('buy');
  const [entryPrice, setEntryPrice] = useState<number | null>(null);
  const [stopLoss, setStopLoss] = useState<number | null>(null);
  const [tp1, setTp1] = useState<number | null>(null);
  const [tp2, setTp2] = useState<number | null>(null);
  const [tp3, setTp3] = useState<number | null>(null);
  const [tp4, setTp4] = useState<number | null>(null);
  const [tp5, setTp5] = useState<number | null>(null);
  const [notes, setNotes] = useState('');

  const handleFormSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    const formData: TradeAlertSubmissionData = {
      asset_name: assetName,
      tradermade_symbol: tradermadeSymbol,
      trade_type: tradeType,
      entry_price: entryPrice,
      stop_loss: stopLoss,
      tp1: tp1 || undefined,
      tp2: tp2 || undefined,
      tp3: tp3 || undefined,
      tp4: tp4 || undefined,
      tp5: tp5 || undefined,
      notes: notes || undefined,
      // Remove status - now handled by database trigger
      // The trigger will automatically set status to 'pending' for limit orders or 'active' for market orders
    };

    await handleSubmit(formData, onSubmit);
  }, [
    assetName, tradermadeSymbol, tradeType, entryPrice, stopLoss,
    tp1, tp2, tp3, tp4, tp5, notes, handleSubmit, onSubmit
  ]);

  return (
    <Card className="glass-effect border-default">
      <CardHeader>
        <CardTitle className="text-primary">Create New Trade Alert</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="asset-name">Asset Name</Label>
            <Input
              type="text"
              id="asset-name"
              value={assetName}
              onChange={(e) => setAssetName(e.target.value)}
              placeholder="e.g., Gold"
            />
          </div>
          <div>
            <Label htmlFor="tradermade-symbol">Tradermade Symbol</Label>
            <Input
              type="text"
              id="tradermade-symbol"
              value={tradermadeSymbol}
              onChange={(e) => setTradermadeSymbol(e.target.value)}
              placeholder="e.g., XAU/USD"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="trade-type">Trade Type</Label>
          <Select value={tradeType} onValueChange={(value) => setTradeType(value as 'buy' | 'sell' | 'buy_limit' | 'sell_limit')}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a trade type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="buy">Buy (Market Order)</SelectItem>
              <SelectItem value="sell">Sell (Market Order)</SelectItem>
              <SelectItem value="buy_limit">Buy Limit</SelectItem>
              <SelectItem value="sell_limit">Sell Limit</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="entry-price">Entry Price</Label>
            <Input
              type="number"
              id="entry-price"
              value={entryPrice !== null ? entryPrice.toString() : ''}
              onChange={(e) => setEntryPrice(e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="e.g., 1950.00"
            />
          </div>
          <div>
            <Label htmlFor="stop-loss">Stop Loss</Label>
            <Input
              type="number"
              id="stop-loss"
              value={stopLoss !== null ? stopLoss.toString() : ''}
              onChange={(e) => setStopLoss(e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="e.g., 1940.00"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="tp1">Take Profit 1</Label>
            <Input
              type="number"
              id="tp1"
              value={tp1 !== null ? tp1.toString() : ''}
              onChange={(e) => setTp1(e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="e.g., 1960.00"
            />
          </div>
          <div>
            <Label htmlFor="tp2">Take Profit 2</Label>
            <Input
              type="number"
              id="tp2"
              value={tp2 !== null ? tp2.toString() : ''}
              onChange={(e) => setTp2(e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="e.g., 1970.00"
            />
          </div>
          <div>
            <Label htmlFor="tp3">Take Profit 3</Label>
            <Input
              type="number"
              id="tp3"
              value={tp3 !== null ? tp3.toString() : ''}
              onChange={(e) => setTp3(e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="e.g., 1980.00"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="tp4">Take Profit 4</Label>
            <Input
              type="number"
              id="tp4"
              value={tp4 !== null ? tp4.toString() : ''}
              onChange={(e) => setTp4(e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="e.g., 1990.00"
            />
          </div>
          <div>
            <Label htmlFor="tp5">Take Profit 5</Label>
            <Input
              type="number"
              id="tp5"
              value={tp5 !== null ? tp5.toString() : ''}
              onChange={(e) => setTp5(e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="e.g., 2000.00"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes for this trade alert"
          />
        </div>

        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button onClick={handleFormSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Create Alert'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default OptimizedNewAlertForm;
