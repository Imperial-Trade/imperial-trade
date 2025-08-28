
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Calculator, TrendingUp, TrendingDown, Target, StopCircle, DollarSign } from "lucide-react";
import { useWebSocketLivePrice } from "@/hooks/useWebSocketLivePrice";
import type { TradeAlertSubmissionData } from '@/hooks/useOptimizedTradeAlertForm';

interface NewAlertFormProps {
  onSubmit: (data: TradeAlertSubmissionData) => Promise<void>;
  onCancel: () => void;
}

const ASSET_OPTIONS = [
  { value: 'EURUSD', label: 'EUR/USD', symbol: 'EURUSD' },
  { value: 'GBPUSD', label: 'GBP/USD', symbol: 'GBPUSD' },
  { value: 'USDJPY', label: 'USD/JPY', symbol: 'USDJPY' },
  { value: 'USDCHF', label: 'USD/CHF', symbol: 'USDCHF' },
  { value: 'AUDUSD', label: 'AUD/USD', symbol: 'AUDUSD' },
  { value: 'USDCAD', label: 'USD/CAD', symbol: 'USDCAD' },
  { value: 'NZDUSD', label: 'NZD/USD', symbol: 'NZDUSD' },
  { value: 'EURGBP', label: 'EUR/GBP', symbol: 'EURGBP' },
  { value: 'EURJPY', label: 'EUR/JPY', symbol: 'EURJPY' },
  { value: 'GBPJPY', label: 'GBP/JPY', symbol: 'GBPJPY' }
];

const NewAlertForm: React.FC<NewAlertFormProps> = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<TradeAlertSubmissionData>({
    asset_name: '',
    tradermade_symbol: '',
    trade_type: 'buy',
    entry_price: 0,
    stop_loss: 0,
    tp1: undefined,
    tp2: undefined,
    tp3: undefined,
    tp4: undefined,
    tp5: undefined,
    notes: ''
  });

  const [autoSync, setAutoSync] = useState(false);
  const [priceMode, setPriceMode] = useState<'levels' | 'direct'>('levels');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [riskReward, setRiskReward] = useState({ risk: 0, reward: 0, ratio: 0 });
  
  // Live price integration
  const { price: livePrice, connectionStatus } = useWebSocketLivePrice(formData.tradermade_symbol);

  // Auto-sync live price to entry when enabled
  useEffect(() => {
    if (autoSync && livePrice && livePrice > 0) {
      setFormData(prev => ({ ...prev, entry_price: livePrice }));
    }
  }, [autoSync, livePrice]);

  // Calculate risk/reward ratios
  useEffect(() => {
    const { entry_price, stop_loss, tp1 } = formData;
    if (entry_price > 0 && stop_loss > 0) {
      const risk = Math.abs(entry_price - stop_loss);
      const reward = tp1 ? Math.abs(tp1 - entry_price) : 0;
      const ratio = risk > 0 ? reward / risk : 0;
      
      setRiskReward({ risk, reward, ratio });
    }
  }, [formData.entry_price, formData.stop_loss, formData.tp1]);

  const handleAssetChange = (value: string) => {
    const selectedAsset = ASSET_OPTIONS.find(asset => asset.value === value);
    if (selectedAsset) {
      setFormData(prev => ({
        ...prev,
        asset_name: selectedAsset.label,
        tradermade_symbol: selectedAsset.symbol
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      await onSubmit(formData);
    } catch (error) {
      console.error('Submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateFormField = (field: keyof TradeAlertSubmissionData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const calculatePips = () => {
    const { entry_price, stop_loss } = formData;
    if (entry_price && stop_loss) {
      return Math.abs(entry_price - stop_loss) * 10000; // Basic pip calculation
    }
    return 0;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Asset Selection */}
      <div className="space-y-2">
        <Label htmlFor="asset">Asset</Label>
        <Select onValueChange={handleAssetChange} required>
          <SelectTrigger>
            <SelectValue placeholder="Select trading pair" />
          </SelectTrigger>
          <SelectContent>
            {ASSET_OPTIONS.map(asset => (
              <SelectItem key={asset.value} value={asset.value}>
                {asset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Live Price Widget */}
      {formData.tradermade_symbol && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Live Price - {formData.asset_name}
              <Badge variant={connectionStatus === 'connected' ? 'default' : 'destructive'}>
                {connectionStatus}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">
                {livePrice ? livePrice.toFixed(5) : '--'}
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="autoSync" className="text-sm">Auto-Sync</Label>
                <Switch
                  id="autoSync"
                  checked={autoSync}
                  onCheckedChange={setAutoSync}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trade Type */}
      <div className="space-y-2">
        <Label htmlFor="tradeType">Trade Type</Label>
        <Select value={formData.trade_type} onValueChange={(value: any) => updateFormField('trade_type', value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="buy">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Market Buy
              </div>
            </SelectItem>
            <SelectItem value="sell">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                Market Sell
              </div>
            </SelectItem>
            <SelectItem value="buy_limit">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                Buy Limit
              </div>
            </SelectItem>
            <SelectItem value="sell_limit">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-orange-500" />
                Sell Limit
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Price Configuration Tabs */}
      <Tabs value={priceMode} onValueChange={(value: any) => setPriceMode(value)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="levels">Price Levels</TabsTrigger>
          <TabsTrigger value="direct">Direct Entry</TabsTrigger>
        </TabsList>

        <TabsContent value="levels" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entryPrice">Entry Price</Label>
              <Input
                id="entryPrice"
                type="number"
                step="0.00001"
                value={formData.entry_price || ''}
                onChange={(e) => updateFormField('entry_price', parseFloat(e.target.value) || 0)}
                placeholder="0.00000"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stopLoss">Stop Loss</Label>
              <Input
                id="stopLoss"
                type="number"
                step="0.00001"
                value={formData.stop_loss || ''}
                onChange={(e) => updateFormField('stop_loss', parseFloat(e.target.value) || 0)}
                placeholder="0.00000"
                required
              />
            </div>
          </div>

          {/* Take Profit Levels */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Take Profit Levels
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4, 5].map(num => (
                <div key={num} className="space-y-2">
                  <Label htmlFor={`tp${num}`} className="text-xs">TP{num}</Label>
                  <Input
                    id={`tp${num}`}
                    type="number"
                    step="0.00001"
                    value={formData[`tp${num}` as keyof TradeAlertSubmissionData] || ''}
                    onChange={(e) => updateFormField(`tp${num}` as keyof TradeAlertSubmissionData, parseFloat(e.target.value) || undefined)}
                    placeholder="0.00000"
                  />
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="direct" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Pip Calculator
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-xs text-muted-foreground">Risk (Pips)</div>
                  <div className="text-lg font-semibold">{calculatePips().toFixed(1)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">R:R Ratio</div>
                  <div className="text-lg font-semibold text-green-500">
                    1:{riskReward.ratio.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Reward</div>
                  <div className="text-lg font-semibold">{(riskReward.reward * 10000).toFixed(1)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Textarea
          id="notes"
          value={formData.notes || ''}
          onChange={(e) => updateFormField('notes', e.target.value)}
          placeholder="Add any additional notes about this trade setup..."
          rows={3}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={isSubmitting || !formData.asset_name || !formData.entry_price || !formData.stop_loss}
          className="flex-1"
        >
          {isSubmitting ? 'Creating...' : 'Create Educational Pattern'}
        </Button>
      </div>
    </form>
  );
};

export default NewAlertForm;
