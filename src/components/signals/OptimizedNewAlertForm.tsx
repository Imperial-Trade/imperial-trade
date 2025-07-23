
import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, AlertTriangle, Target } from 'lucide-react';
import EnhancedLivePriceDisplay from './EnhancedLivePriceDisplay';
import { AssetSelector, SUPPORTED_ASSETS, type AssetOption } from './AssetSelector';
import { useToast } from '@/components/ui/use-toast';
import type { TradeAlertSubmissionData } from '@/hooks/useOptimizedTradeAlertForm';

interface OptimizedNewAlertFormProps {
  onSubmit: (data: TradeAlertSubmissionData) => Promise<void>;
  onCancel: () => void;
}

const OptimizedNewAlertForm: React.FC<OptimizedNewAlertFormProps> = ({
  onSubmit,
  onCancel
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetOption | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    asset_name: '',
    finnhub_symbol: '',
    trade_type: 'buy_long',
    entry_price: '',
    stop_loss: '',
    tp1: '',
    tp2: '',
    tp3: '',
    tp4: '',
    tp5: '',
    notes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleAssetChange = useCallback((asset: AssetOption) => {
    setSelectedAsset(asset);
    setFormData(prev => ({
      ...prev,
      asset_name: asset.name,
      finnhub_symbol: asset.symbol
    }));
    
    // Clear asset-related errors
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.asset_name;
      delete newErrors.finnhub_symbol;
      return newErrors;
    });
  }, []);

  const handleInputChange = useCallback((field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field-specific errors
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [errors]);

  const handleUseCurrentPrice = useCallback((price: number) => {
    setFormData(prev => ({ ...prev, entry_price: price.toString() }));
    
    toast({
      title: "Price Updated",
      description: `Entry price set to $${price.toFixed(2)}`,
    });
  }, [toast]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.asset_name) newErrors.asset_name = 'Please select a trading instrument';
    if (!formData.entry_price) newErrors.entry_price = 'Entry price is required';
    if (!formData.stop_loss) newErrors.stop_loss = 'Stop loss is required';
    if (!formData.tp1) newErrors.tp1 = 'At least TP1 is required';

    // Validate numeric fields
    const entryPrice = parseFloat(formData.entry_price);
    const stopLoss = parseFloat(formData.stop_loss);
    const tp1 = parseFloat(formData.tp1);

    if (isNaN(entryPrice) || entryPrice <= 0) {
      newErrors.entry_price = 'Entry price must be a valid positive number';
    }
    if (isNaN(stopLoss) || stopLoss <= 0) {
      newErrors.stop_loss = 'Stop loss must be a valid positive number';
    }
    if (isNaN(tp1) || tp1 <= 0) {
      newErrors.tp1 = 'TP1 must be a valid positive number';
    }

    // Validate price relationships for buy_long
    if (formData.trade_type === 'buy_long' && !isNaN(entryPrice) && !isNaN(stopLoss) && !isNaN(tp1)) {
      if (stopLoss >= entryPrice) {
        newErrors.stop_loss = 'Stop loss must be below entry price for long positions';
      }
      if (tp1 <= entryPrice) {
        newErrors.tp1 = 'TP1 must be above entry price for long positions';
      }
    }

    // Validate price relationships for sell_short
    if (formData.trade_type === 'sell_short' && !isNaN(entryPrice) && !isNaN(stopLoss) && !isNaN(tp1)) {
      if (stopLoss <= entryPrice) {
        newErrors.stop_loss = 'Stop loss must be above entry price for short positions';
      }
      if (tp1 >= entryPrice) {
        newErrors.tp1 = 'TP1 must be below entry price for short positions';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please correct the errors before submitting.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const submissionData: TradeAlertSubmissionData = {
        asset_name: formData.asset_name,
        finnhub_symbol: formData.finnhub_symbol,
        trade_type: formData.trade_type as 'buy_long' | 'sell_short',
        entry_price: parseFloat(formData.entry_price),
        stop_loss: parseFloat(formData.stop_loss),
        tp1: parseFloat(formData.tp1),
        tp2: formData.tp2 ? parseFloat(formData.tp2) : null,
        tp3: formData.tp3 ? parseFloat(formData.tp3) : null,
        tp4: formData.tp4 ? parseFloat(formData.tp4) : null,
        tp5: formData.tp5 ? parseFloat(formData.tp5) : null,
        notes: formData.notes || null
      };

      await onSubmit(submissionData);
    } catch (error) {
      console.error('Form submission error:', error);
      toast({
        title: "Submission Error",
        description: "Failed to create educational pattern. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const riskRewardRatio = React.useMemo(() => {
    const entryPrice = parseFloat(formData.entry_price);
    const stopLoss = parseFloat(formData.stop_loss);
    const tp1 = parseFloat(formData.tp1);

    if (isNaN(entryPrice) || isNaN(stopLoss) || isNaN(tp1)) return null;

    const risk = Math.abs(entryPrice - stopLoss);
    const reward = Math.abs(tp1 - entryPrice);
    
    if (risk === 0) return null;
    
    return (reward / risk).toFixed(2);
  }, [formData.entry_price, formData.stop_loss, formData.tp1]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Asset Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-accent-green" />
            Trading Instrument Selection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <AssetSelector
            value={formData.finnhub_symbol}
            onValueChange={(value) => handleInputChange('finnhub_symbol', value)}
            onAssetChange={handleAssetChange}
          />
          
          {errors.asset_name && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{errors.asset_name}</AlertDescription>
            </Alert>
          )}

          {/* Live Price Display */}
          {selectedAsset && (
            <EnhancedLivePriceDisplay
              symbol={selectedAsset.symbol}
              assetName={selectedAsset.name}
              onUseCurrentPrice={handleUseCurrentPrice}
              className="mt-4"
            />
          )}
        </CardContent>
      </Card>

      {/* Trade Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-accent-green" />
            Educational Pattern Setup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Trade Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Position Type</label>
            <Select 
              value={formData.trade_type} 
              onValueChange={(value) => handleInputChange('trade_type', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="buy_long">Long Position (Buy)</SelectItem>
                <SelectItem value="sell_short">Short Position (Sell)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Entry Price */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Entry Price</label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.entry_price}
              onChange={(e) => handleInputChange('entry_price', e.target.value)}
              className={errors.entry_price ? 'border-red-500' : ''}
            />
            {errors.entry_price && (
              <p className="text-sm text-red-500">{errors.entry_price}</p>
            )}
          </div>

          {/* Stop Loss */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Stop Loss</label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.stop_loss}
              onChange={(e) => handleInputChange('stop_loss', e.target.value)}
              className={errors.stop_loss ? 'border-red-500' : ''}
            />
            {errors.stop_loss && (
              <p className="text-sm text-red-500">{errors.stop_loss}</p>
            )}
          </div>

          {/* Take Profit Levels */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5].map((num) => (
              <div key={num} className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  TP{num} {num === 1 && <span className="text-red-500">*</span>}
                </label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData[`tp${num}` as keyof typeof formData]}
                  onChange={(e) => handleInputChange(`tp${num}`, e.target.value)}
                  className={errors[`tp${num}`] ? 'border-red-500' : ''}
                />
                {errors[`tp${num}`] && (
                  <p className="text-sm text-red-500">{errors[`tp${num}`]}</p>
                )}
              </div>
            ))}
          </div>

          {/* Risk/Reward Display */}
          {riskRewardRatio && (
            <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
              <Badge variant="outline" className="text-accent-green border-accent-green/30">
                Risk/Reward: 1:{riskRewardRatio}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Educational Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Add educational context, analysis, or reasoning for this pattern..."
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-gradient-to-r from-accent-green to-green-600 hover:from-green-600 hover:to-green-700"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating Pattern...
            </>
          ) : (
            'Create Educational Pattern'
          )}
        </Button>
      </div>
    </form>
  );
};

export default OptimizedNewAlertForm;
