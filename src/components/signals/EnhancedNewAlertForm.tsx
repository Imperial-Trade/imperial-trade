
import React, { useState, useCallback, useEffect } from 'react';
import { useOptimizedTradeAlertForm, type TradeAlertSubmissionData } from '@/hooks/useOptimizedTradeAlertForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AssetSelector } from './AssetSelector';
import EnhancedLivePriceDisplay from './EnhancedLivePriceDisplay';
import { calculatePipsFromPrice, calculatePriceFromPips, getDirectionFromTradeType, formatPips } from '@/utils/pipCalculations';
import { Switch } from '@/components/ui/switch';
import { Info, Calculator, DollarSign, TrendingUp } from 'lucide-react';

interface EnhancedNewAlertFormProps {
  onSubmit: (data: TradeAlertSubmissionData) => Promise<void>;
  onCancel?: () => void;
}

const EnhancedNewAlertForm: React.FC<EnhancedNewAlertFormProps> = ({ onSubmit, onCancel }) => {
  const { handleSubmit, isSubmitting } = useOptimizedTradeAlertForm();
  
  // Form state
  const [selectedAsset, setSelectedAsset] = useState('');
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
  
  // Pip calculation state
  const [isPipMode, setIsPipMode] = useState(false);
  const [stopLossPips, setStopLossPips] = useState<number | null>(null);
  const [tp1Pips, setTp1Pips] = useState<number | null>(null);
  const [tp2Pips, setTp2Pips] = useState<number | null>(null);
  const [tp3Pips, setTp3Pips] = useState<number | null>(null);
  const [tp4Pips, setTp4Pips] = useState<number | null>(null);
  const [tp5Pips, setTp5Pips] = useState<number | null>(null);
  
  // Live price
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);

  // Handle asset selection
  const handleAssetChange = useCallback((asset: any) => {
    setSelectedAsset(asset.symbol);
    setAssetName(asset.name);
    setTradermadeSymbol(asset.symbol);
  }, []);

  // Use current price for entry
  const handleUseCurrentPrice = useCallback((price: number) => {
    setEntryPrice(price);
    setCurrentPrice(price);
  }, []);

  // Auto-sync price and pip calculations
  useEffect(() => {
    if (!entryPrice || !tradermadeSymbol) return;

    // Update pips when prices change
    if (stopLoss) {
      const pips = calculatePipsFromPrice(entryPrice, stopLoss, tradermadeSymbol);
      setStopLossPips(pips);
    }
    if (tp1) {
      const pips = calculatePipsFromPrice(entryPrice, tp1, tradermadeSymbol);
      setTp1Pips(pips);
    }
    if (tp2) {
      const pips = calculatePipsFromPrice(entryPrice, tp2, tradermadeSymbol);
      setTp2Pips(pips);
    }
    if (tp3) {
      const pips = calculatePipsFromPrice(entryPrice, tp3, tradermadeSymbol);
      setTp3Pips(pips);
    }
    if (tp4) {
      const pips = calculatePipsFromPrice(entryPrice, tp4, tradermadeSymbol);
      setTp4Pips(pips);
    }
    if (tp5) {
      const pips = calculatePipsFromPrice(entryPrice, tp5, tradermadeSymbol);
      setTp5Pips(pips);
    }
  }, [entryPrice, stopLoss, tp1, tp2, tp3, tp4, tp5, tradermadeSymbol]);

  // Handle pip input changes
  const handlePipChange = useCallback((field: string, pips: number | null) => {
    if (!entryPrice || !tradermadeSymbol || pips === null) return;

    const direction = getDirectionFromTradeType(tradeType, field as 'stop_loss' | 'take_profit');
    const price = calculatePriceFromPips(entryPrice, pips, tradermadeSymbol, direction);

    switch (field) {
      case 'stop_loss':
        setStopLoss(price);
        setStopLossPips(pips);
        break;
      case 'tp1':
        setTp1(price);
        setTp1Pips(pips);
        break;
      case 'tp2':
        setTp2(price);
        setTp2Pips(pips);
        break;
      case 'tp3':
        setTp3(price);
        setTp3Pips(pips);
        break;
      case 'tp4':
        setTp4(price);
        setTp4Pips(pips);
        break;
      case 'tp5':
        setTp5(price);
        setTp5Pips(pips);
        break;
    }
  }, [entryPrice, tradermadeSymbol, tradeType]);

  const handleFormSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    const formData: TradeAlertSubmissionData = {
      asset_name: assetName,
      tradermade_symbol: tradermadeSymbol,
      trade_type: tradeType,
      entry_price: entryPrice!,
      stop_loss: stopLoss!,
      tp1: tp1 || undefined,
      tp2: tp2 || undefined,
      tp3: tp3 || undefined,
      tp4: tp4 || undefined,
      tp5: tp5 || undefined,
      notes: notes || undefined,
    };

    await handleSubmit(formData, onSubmit);
  }, [assetName, tradermadeSymbol, tradeType, entryPrice, stopLoss, tp1, tp2, tp3, tp4, tp5, notes, handleSubmit, onSubmit]);

  const isValid = assetName && entryPrice && stopLoss;

  return (
    <div className="space-y-6">
      {/* Asset Selection & Live Price */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Asset Selection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AssetSelector
              value={selectedAsset}
              onValueChange={setSelectedAsset}
              onAssetChange={handleAssetChange}
            />
          </CardContent>
        </Card>

        {tradermadeSymbol && (
          <EnhancedLivePriceDisplay
            symbol={tradermadeSymbol}
            assetName={assetName}
            onUseCurrentPrice={handleUseCurrentPrice}
            onPriceUpdate={setCurrentPrice}
          />
        )}
      </div>

      {/* Main Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Trade Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Trade Type */}
          <div>
            <Label htmlFor="trade-type">Trade Type</Label>
            <Select value={tradeType} onValueChange={(value) => setTradeType(value as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="buy">Buy (Market Order)</SelectItem>
                <SelectItem value="sell">Sell (Market Order)</SelectItem>
                <SelectItem value="buy_limit">Buy Limit</SelectItem>
                <SelectItem value="sell_limit">Sell Limit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Entry Price */}
          <div>
            <Label htmlFor="entry-price">Entry Price</Label>
            <Input
              type="number"
              id="entry-price"
              value={entryPrice !== null ? entryPrice.toString() : ''}
              onChange={(e) => setEntryPrice(e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="Entry price"
              step="0.0001"
            />
          </div>

          {/* Price/Pip Mode Toggle */}
          {entryPrice && tradermadeSymbol && (
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                <span className="text-sm font-medium">Input Mode</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm ${!isPipMode ? 'font-medium' : 'text-muted-foreground'}`}>
                  Price
                </span>
                <Switch
                  checked={isPipMode}
                  onCheckedChange={setIsPipMode}
                />
                <span className={`text-sm ${isPipMode ? 'font-medium' : 'text-muted-foreground'}`}>
                  Pips
                </span>
              </div>
            </div>
          )}

          {/* Stop Loss & Take Profits */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Stop Loss */}
            <div>
              <Label htmlFor="stop-loss">
                Stop Loss {isPipMode && stopLossPips ? `(${formatPips(stopLossPips)} pips)` : ''}
              </Label>
              {isPipMode ? (
                <Input
                  type="number"
                  value={stopLossPips !== null ? stopLossPips.toString() : ''}
                  onChange={(e) => handlePipChange('stop_loss', e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="Pips"
                />
              ) : (
                <Input
                  type="number"
                  id="stop-loss"
                  value={stopLoss !== null ? stopLoss.toString() : ''}
                  onChange={(e) => setStopLoss(e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="Stop loss price"
                  step="0.0001"
                />
              )}
            </div>

            {/* Take Profit 1 */}
            <div>
              <Label htmlFor="tp1">
                Take Profit 1 {isPipMode && tp1Pips ? `(${formatPips(tp1Pips)} pips)` : ''}
              </Label>
              {isPipMode ? (
                <Input
                  type="number"
                  value={tp1Pips !== null ? tp1Pips.toString() : ''}
                  onChange={(e) => handlePipChange('tp1', e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="Pips"
                />
              ) : (
                <Input
                  type="number"
                  id="tp1"
                  value={tp1 !== null ? tp1.toString() : ''}
                  onChange={(e) => setTp1(e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="TP1 price"
                  step="0.0001"
                />
              )}
            </div>
          </div>

          {/* Additional Take Profits */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>TP2 {isPipMode && tp2Pips ? `(${formatPips(tp2Pips)} pips)` : ''}</Label>
              {isPipMode ? (
                <Input
                  type="number"
                  value={tp2Pips !== null ? tp2Pips.toString() : ''}
                  onChange={(e) => handlePipChange('tp2', e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="Pips"
                />
              ) : (
                <Input
                  type="number"
                  value={tp2 !== null ? tp2.toString() : ''}
                  onChange={(e) => setTp2(e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="TP2 price"
                  step="0.0001"
                />
              )}
            </div>

            <div>
              <Label>TP3 {isPipMode && tp3Pips ? `(${formatPips(tp3Pips)} pips)` : ''}</Label>
              {isPipMode ? (
                <Input
                  type="number"
                  value={tp3Pips !== null ? tp3Pips.toString() : ''}
                  onChange={(e) => handlePipChange('tp3', e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="Pips"
                />
              ) : (
                <Input
                  type="number"
                  value={tp3 !== null ? tp3.toString() : ''}
                  onChange={(e) => setTp3(e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="TP3 price"
                  step="0.0001"
                />
              )}
            </div>

            <div>
              <Label>TP4 {isPipMode && tp4Pips ? `(${formatPips(tp4Pips)} pips)` : ''}</Label>
              {isPipMode ? (
                <Input
                  type="number"
                  value={tp4Pips !== null ? tp4Pips.toString() : ''}
                  onChange={(e) => handlePipChange('tp4', e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="Pips"
                />
              ) : (
                <Input
                  type="number"
                  value={tp4 !== null ? tp4.toString() : ''}
                  onChange={(e) => setTp4(e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="TP4 price"
                  step="0.0001"
                />
              )}
            </div>
          </div>

          <div className="md:w-1/3">
            <Label>TP5 {isPipMode && tp5Pips ? `(${formatPips(tp5Pips)} pips)` : ''}</Label>
            {isPipMode ? (
              <Input
                type="number"
                value={tp5Pips !== null ? tp5Pips.toString() : ''}
                onChange={(e) => handlePipChange('tp5', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="Pips"
              />
            ) : (
              <Input
                type="number"
                value={tp5 !== null ? tp5.toString() : ''}
                onChange={(e) => setTp5(e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="TP5 price"
                step="0.0001"
              />
            )}
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes for this trade alert"
              rows={3}
            />
          </div>

          {/* Risk/Reward Info */}
          {entryPrice && stopLoss && tp1 && (
            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4" />
                <span className="text-sm font-medium">Trade Analysis</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Risk:</span>
                  <div className="font-medium text-red-400">
                    {formatPips(calculatePipsFromPrice(entryPrice, stopLoss, tradermadeSymbol))} pips
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Reward (TP1):</span>
                  <div className="font-medium text-green-400">
                    {formatPips(calculatePipsFromPrice(entryPrice, tp1, tradermadeSymbol))} pips
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">R:R Ratio:</span>
                  <div className="font-medium">
                    {(calculatePipsFromPrice(entryPrice, tp1, tradermadeSymbol) / 
                      calculatePipsFromPrice(entryPrice, stopLoss, tradermadeSymbol)).toFixed(2)}:1
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Order Type:</span>
                  <div className="font-medium">
                    {tradeType.includes('limit') ? 'Pending' : 'Market'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4">
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button 
              onClick={handleFormSubmit} 
              disabled={isSubmitting || !isValid}
              className="min-w-32"
            >
              {isSubmitting ? 'Creating...' : 'Create Alert'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedNewAlertForm;
