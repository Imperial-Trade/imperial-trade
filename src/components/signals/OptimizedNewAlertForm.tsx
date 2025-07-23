
import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle, Plus, X } from 'lucide-react';
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
    trade_type: 'buy' as 'buy' | 'sell' | 'buy_limit' | 'sell_limit',
    entry_price: '',
    stop_loss: '',
    tp1: '',
    tp2: '',
    tp3: '',
    tp4: '',
    tp5: '',
    notes: ''
  });

  const [takeProfits, setTakeProfits] = useState<string[]>(['']);
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

  const addTakeProfit = () => {
    if (takeProfits.length < 5) {
      setTakeProfits([...takeProfits, '']);
    }
  };

  const removeTakeProfit = (index: number) => {
    if (takeProfits.length > 1) {
      const newTPs = takeProfits.filter((_, i) => i !== index);
      setTakeProfits(newTPs);
      
      // Clear corresponding form data
      const tpKeys = ['tp1', 'tp2', 'tp3', 'tp4', 'tp5'];
      setFormData(prev => ({
        ...prev,
        [tpKeys[index]]: ''
      }));
    }
  };

  const handleTakeProfitChange = (index: number, value: string) => {
    const newTPs = [...takeProfits];
    newTPs[index] = value;
    setTakeProfits(newTPs);
    
    const tpKeys = ['tp1', 'tp2', 'tp3', 'tp4', 'tp5'];
    setFormData(prev => ({
      ...prev,
      [tpKeys[index]]: value
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.asset_name) newErrors.asset_name = 'Please select an asset';
    if (!formData.entry_price) newErrors.entry_price = 'Entry price is required';
    if (!formData.stop_loss) newErrors.stop_loss = 'Stop loss is required';
    if (!takeProfits[0]) newErrors.tp1 = 'At least one take profit is required';

    // Validate numeric fields
    const entryPrice = parseFloat(formData.entry_price);
    const stopLoss = parseFloat(formData.stop_loss);
    const tp1 = parseFloat(takeProfits[0]);

    if (isNaN(entryPrice) || entryPrice <= 0) {
      newErrors.entry_price = 'Entry price must be a valid positive number';
    }
    if (isNaN(stopLoss) || stopLoss <= 0) {
      newErrors.stop_loss = 'Stop loss must be a valid positive number';
    }
    if (isNaN(tp1) || tp1 <= 0) {
      newErrors.tp1 = 'Take profit must be a valid positive number';
    }

    // Validate price relationships for buy
    if (formData.trade_type === 'buy' && !isNaN(entryPrice) && !isNaN(stopLoss) && !isNaN(tp1)) {
      if (stopLoss >= entryPrice) {
        newErrors.stop_loss = 'Stop loss must be below entry price for buy positions';
      }
      if (tp1 <= entryPrice) {
        newErrors.tp1 = 'Take profit must be above entry price for buy positions';
      }
    }

    // Validate price relationships for sell
    if (formData.trade_type === 'sell' && !isNaN(entryPrice) && !isNaN(stopLoss) && !isNaN(tp1)) {
      if (stopLoss <= entryPrice) {
        newErrors.stop_loss = 'Stop loss must be above entry price for sell positions';
      }
      if (tp1 >= entryPrice) {
        newErrors.tp1 = 'Take profit must be below entry price for sell positions';
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
        trade_type: formData.trade_type,
        entry_price: parseFloat(formData.entry_price),
        stop_loss: parseFloat(formData.stop_loss),
        tp1: takeProfits[0] ? parseFloat(takeProfits[0]) : null,
        tp2: takeProfits[1] ? parseFloat(takeProfits[1]) : null,
        tp3: takeProfits[2] ? parseFloat(takeProfits[2]) : null,
        tp4: takeProfits[3] ? parseFloat(takeProfits[3]) : null,
        tp5: takeProfits[4] ? parseFloat(takeProfits[4]) : null,
        notes: formData.notes || null
      };

      await onSubmit(submissionData);
    } catch (error) {
      console.error('Form submission error:', error);
      toast({
        title: "Submission Error",
        description: "Failed to create signal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full p-6 bg-card rounded-lg border border-border">
      <form onSubmit={handleSubmit} className="w-full space-y-4">
        {/* Asset Selection */}
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
          <div className="w-full">
            <EnhancedLivePriceDisplay
              symbol={selectedAsset.symbol}
              assetName={selectedAsset.name}
              onUseCurrentPrice={handleUseCurrentPrice}
              className="w-full mb-4"
            />
          </div>
        )}

        {/* Trade Type & Entry Price Row */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Trade Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Trade Type</label>
            <Select 
              value={formData.trade_type} 
              onValueChange={(value) => handleInputChange('trade_type', value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="buy">Buy</SelectItem>
                <SelectItem value="sell">Sell</SelectItem>
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
              className={`w-full ${errors.entry_price ? 'border-red-500' : ''}`}
            />
            {errors.entry_price && (
              <p className="text-sm text-red-500">{errors.entry_price}</p>
            )}
          </div>
        </div>

        {/* Stop Loss */}
        <div className="w-full space-y-2">
          <label className="text-sm font-medium text-foreground">Stop Loss</label>
          <Input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={formData.stop_loss}
            onChange={(e) => handleInputChange('stop_loss', e.target.value)}
            className={`w-full ${errors.stop_loss ? 'border-red-500' : ''}`}
          />
          {errors.stop_loss && (
            <p className="text-sm text-red-500">{errors.stop_loss}</p>
          )}
        </div>

        {/* Take Profits */}
        <div className="w-full space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">Take Profits</label>
            {takeProfits.length < 5 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addTakeProfit}
                className="h-6 px-2 text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add TP
              </Button>
            )}
          </div>
          
          {takeProfits.map((tp, index) => (
            <div key={index} className="flex items-center gap-2 w-full">
              <Input
                type="number"
                step="0.01"
                placeholder={`TP${index + 1}`}
                value={tp}
                onChange={(e) => handleTakeProfitChange(index, e.target.value)}
                className={`flex-1 ${errors[`tp${index + 1}`] ? 'border-red-500' : ''}`}
              />
              {takeProfits.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeTakeProfit(index)}
                  className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
          
          {errors.tp1 && (
            <p className="text-sm text-red-500">{errors.tp1}</p>
          )}
        </div>

        {/* Notes */}
        <div className="w-full space-y-2">
          <label className="text-sm font-medium text-foreground">Notes</label>
          <Textarea
            placeholder="Add notes about this signal..."
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            rows={3}
            className="w-full"
          />
        </div>

        {/* Action Buttons */}
        <div className="w-full flex gap-3 pt-2">
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
            className="flex-1 bg-accent-green hover:bg-accent-green/90"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Posting...
              </>
            ) : (
              'Post Signal'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default OptimizedNewAlertForm;
