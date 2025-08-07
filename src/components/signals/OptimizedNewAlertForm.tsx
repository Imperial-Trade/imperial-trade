
import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, AlertTriangle, Plus, X, Info, Clock, TrendingUp, TrendingDown, Calculator } from 'lucide-react';
import EnhancedLivePriceDisplay from './EnhancedLivePriceDisplay';
import { AssetSelector, SUPPORTED_ASSETS, type AssetOption } from './AssetSelector';
import { useToast } from '@/components/ui/use-toast';
import type { TradeAlertSubmissionData } from '@/hooks/useOptimizedTradeAlertForm';
import { 
  calculatePipsFromPrice, 
  calculatePriceFromPips, 
  formatPips, 
  getDirectionFromTradeType 
} from '@/utils/pipCalculations';

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
  const [isLoadingPriceData, setIsLoadingPriceData] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    asset_name: '',
    tradermade_symbol: '',
    trade_type: 'buy' as 'buy' | 'sell' | 'buy_limit' | 'sell_limit',
    entry_price: '',
    stop_loss: '',
    tp1: '',
    tp2: '',
    tp3: '',
    tp4: '',
    tp5: '',
    notes: '',
    status: 'active' as const
  });

  const [takeProfits, setTakeProfits] = useState<string[]>(['']);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Pip calculation state
  const [pipInputs, setPipInputs] = useState({
    stop_loss_pips: '',
    tp1_pips: '',
    tp2_pips: '',
    tp3_pips: '',
    tp4_pips: '',
    tp5_pips: ''
  });

  const handleAssetChange = useCallback((asset: AssetOption) => {
    // Start loading immediately when asset is selected
    setIsLoadingPriceData(true);
    setSelectedAsset(asset);
    setFormData(prev => ({
      ...prev,
      asset_name: asset.name,
      tradermade_symbol: asset.symbol
    }));
    
    // Clear asset-related errors
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.asset_name;
      delete newErrors.tradermade_symbol;
      return newErrors;
    });

    // Reset loading state after a short delay to allow the price component to initialize
    setTimeout(() => {
      setIsLoadingPriceData(false);
    }, 1500);
  }, []);

  const handleInputChange = useCallback((field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // If entry price changes and we have existing pip values, recalculate prices
    if (field === 'entry_price' && value && selectedAsset) {
      const newEntryPrice = parseFloat(value.toString());
      if (!isNaN(newEntryPrice)) {
        
        // Recalculate stop loss if stop loss pips exist
        if (pipInputs.stop_loss_pips) {
          const stopLossPips = parseFloat(pipInputs.stop_loss_pips);
          if (!isNaN(stopLossPips) && stopLossPips > 0) {
            const direction = getDirectionFromTradeType(formData.trade_type, 'stop_loss');
            const calculatedStopLoss = calculatePriceFromPips(newEntryPrice, stopLossPips, selectedAsset.symbol, direction);
            setFormData(prev => ({ ...prev, stop_loss: calculatedStopLoss.toFixed(5) }));
          }
        }
        
        // Recalculate take profits if take profit pips exist
        ['tp1_pips', 'tp2_pips', 'tp3_pips', 'tp4_pips', 'tp5_pips'].forEach((pipField, index) => {
          const pipValue = pipInputs[pipField as keyof typeof pipInputs];
          if (pipValue) {
            const tpPips = parseFloat(pipValue);
            if (!isNaN(tpPips) && tpPips > 0 && index < takeProfits.length) {
              const direction = getDirectionFromTradeType(formData.trade_type, 'take_profit');
              const calculatedPrice = calculatePriceFromPips(newEntryPrice, tpPips, selectedAsset.symbol, direction);
              
              const newTPs = [...takeProfits];
              newTPs[index] = calculatedPrice.toFixed(5);
              setTakeProfits(newTPs);
              
              const tpKeys = ['tp1', 'tp2', 'tp3', 'tp4', 'tp5'];
              setFormData(prev => ({
                ...prev,
                [tpKeys[index]]: calculatedPrice.toFixed(5)
              }));
            }
          }
        });
      }
    }
    
    // Clear both stop loss fields when either is deleted or set to zero
    if (field === 'stop_loss' || field === 'stop_loss_pips') {
      const numValue = parseFloat(value.toString());
      if (!value || value === '' || numValue === 0 || isNaN(numValue)) {
        setFormData(prev => ({ ...prev, stop_loss: '' }));
        setPipInputs(prev => ({ ...prev, stop_loss_pips: '' }));
        return; // Exit early to prevent further processing
      }
    }
    
    // Clear both take profit fields when either is deleted or set to zero
    const tpFields = ['tp1', 'tp2', 'tp3', 'tp4', 'tp5'];
    const tpPipFields = ['tp1_pips', 'tp2_pips', 'tp3_pips', 'tp4_pips', 'tp5_pips'];
    
    tpFields.forEach((tpField, index) => {
      if (field === tpField || field === tpPipFields[index]) {
        const numValue = parseFloat(value.toString());
        if (!value || value === '' || numValue === 0 || isNaN(numValue)) {
          // Clear the corresponding TP price
          setFormData(prev => ({ ...prev, [tpField]: '' }));
          // Clear the corresponding TP pips
          setPipInputs(prev => ({ ...prev, [tpPipFields[index]]: '' }));
          // Clear from takeProfits array
          const newTPs = [...takeProfits];
          newTPs[index] = '';
          setTakeProfits(newTPs);
        }
      }
    });
    
    // Clear field-specific errors
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [errors, selectedAsset, formData.trade_type, pipInputs, takeProfits]);

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

    // Calculate pips when price changes
    if (value && formData.entry_price && selectedAsset) {
      const entryPrice = parseFloat(formData.entry_price);
      const targetPrice = parseFloat(value);
      if (!isNaN(entryPrice) && !isNaN(targetPrice)) {
        const pips = calculatePipsFromPrice(entryPrice, targetPrice, selectedAsset.symbol);
        const pipKeys = ['tp1_pips', 'tp2_pips', 'tp3_pips', 'tp4_pips', 'tp5_pips'];
        setPipInputs(prev => ({
          ...prev,
          [pipKeys[index]]: formatPips(pips)
        }));
      }
    }
  };

  // Handle pip input changes
  const handlePipChange = useCallback((field: string, pips: string) => {
    setPipInputs(prev => ({ ...prev, [field]: pips }));
    
    // Clear both fields if pips is deleted or zero
    if (!pips || pips === '' || parseFloat(pips) === 0 || isNaN(parseFloat(pips))) {
      if (field === 'stop_loss_pips') {
        setFormData(prev => ({ ...prev, stop_loss: '' }));
        setPipInputs(prev => ({ ...prev, stop_loss_pips: '' }));
        return;
      } else {
        // Handle TP pips clearing
        const tpIndex = parseInt(field.replace('tp', '').replace('_pips', '')) - 1;
        if (tpIndex >= 0 && tpIndex < 5) {
          const tpKeys = ['tp1', 'tp2', 'tp3', 'tp4', 'tp5'];
          const tpPipKeys = ['tp1_pips', 'tp2_pips', 'tp3_pips', 'tp4_pips', 'tp5_pips'];
          
          setFormData(prev => ({ ...prev, [tpKeys[tpIndex]]: '' }));
          setPipInputs(prev => ({ ...prev, [tpPipKeys[tpIndex]]: '' }));
          
          if (tpIndex < takeProfits.length) {
            const newTPs = [...takeProfits];
            newTPs[tpIndex] = '';
            setTakeProfits(newTPs);
          }
        }
        return;
      }
    }
    
    if (pips && formData.entry_price && selectedAsset) {
      const entryPrice = parseFloat(formData.entry_price);
      const pipValue = parseFloat(pips);
      
      if (!isNaN(entryPrice) && !isNaN(pipValue) && pipValue > 0) {
        let direction: 'up' | 'down' = 'up';
        let targetType: 'stop_loss' | 'take_profit' = 'take_profit';
        
        if (field === 'stop_loss_pips') {
          targetType = 'stop_loss';
        }
        
        direction = getDirectionFromTradeType(formData.trade_type, targetType);
        const calculatedPrice = calculatePriceFromPips(entryPrice, pipValue, selectedAsset.symbol, direction);
        
        console.log(`Pip calculation: ${pips} pips for ${field} = ${calculatedPrice.toFixed(5)} price`);
        
        if (field === 'stop_loss_pips') {
          setFormData(prev => ({ ...prev, stop_loss: calculatedPrice.toFixed(5) }));
        } else {
          const tpIndex = parseInt(field.replace('tp', '').replace('_pips', '')) - 1;
          if (tpIndex >= 0 && tpIndex < takeProfits.length) {
            const newTPs = [...takeProfits];
            newTPs[tpIndex] = calculatedPrice.toFixed(5);
            setTakeProfits(newTPs);
            
            const tpKeys = ['tp1', 'tp2', 'tp3', 'tp4', 'tp5'];
            setFormData(prev => ({
              ...prev,
              [tpKeys[tpIndex]]: calculatedPrice.toFixed(5)
            }));
          }
        }
      }
    }
  }, [formData.entry_price, formData.trade_type, selectedAsset, takeProfits]);

  // Handle stop loss change with pip calculation
  const handleStopLossChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, stop_loss: value }));
    
    // Calculate pips when stop loss price changes
    if (value && formData.entry_price && selectedAsset) {
      const entryPrice = parseFloat(formData.entry_price);
      const stopLossPrice = parseFloat(value);
      if (!isNaN(entryPrice) && !isNaN(stopLossPrice)) {
        const pips = calculatePipsFromPrice(entryPrice, stopLossPrice, selectedAsset.symbol);
        setPipInputs(prev => ({
          ...prev,
          stop_loss_pips: formatPips(pips)
        }));
      }
    }
  }, [formData.entry_price, selectedAsset]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Basic required field validation
    if (!formData.asset_name) newErrors.asset_name = 'Please select an asset';
    if (!formData.entry_price) newErrors.entry_price = 'Entry price is required';
    if (!formData.stop_loss) newErrors.stop_loss = 'Stop loss is required';
    if (!takeProfits[0]) newErrors.tp1 = 'At least one take profit is required';

    // Only validate numbers if fields are not empty
    if (formData.entry_price) {
      const entryPrice = parseFloat(formData.entry_price);
      if (isNaN(entryPrice) || entryPrice <= 0) {
        newErrors.entry_price = 'Entry price must be a positive number';
      }
    }

    if (formData.stop_loss) {
      const stopLoss = parseFloat(formData.stop_loss);
      if (isNaN(stopLoss) || stopLoss <= 0) {
        newErrors.stop_loss = 'Stop loss must be a positive number';
      }
    }

    if (takeProfits[0]) {
      const tp1 = parseFloat(takeProfits[0]);
      if (isNaN(tp1) || tp1 <= 0) {
        newErrors.tp1 = 'Take profit must be a positive number';
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
        tradermade_symbol: formData.tradermade_symbol,
        trade_type: formData.trade_type,
        entry_price: parseFloat(formData.entry_price),
        stop_loss: parseFloat(formData.stop_loss),
        tp1: takeProfits[0] && takeProfits[0].trim() ? parseFloat(takeProfits[0]) : undefined,
        tp2: takeProfits[1] && takeProfits[1].trim() ? parseFloat(takeProfits[1]) : undefined,
        tp3: takeProfits[2] && takeProfits[2].trim() ? parseFloat(takeProfits[2]) : undefined,
        tp4: takeProfits[3] && takeProfits[3].trim() ? parseFloat(takeProfits[3]) : undefined,
        tp5: takeProfits[4] && takeProfits[4].trim() ? parseFloat(takeProfits[4]) : undefined,
        notes: formData.notes || undefined,
        status: 'active'
      };

      console.log('📋 Submission Data:', submissionData);
      console.log('✅ Validation passed - submitting to API');

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
          value={formData.tradermade_symbol}
          onValueChange={(value) => handleInputChange('tradermade_symbol', value)}
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
            {isLoadingPriceData ? (
              <div className="w-full p-4 bg-card border border-border rounded-lg animate-pulse">
                <div className="flex items-center justify-between mb-3">
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-20"></div>
                    <div className="h-6 bg-muted rounded w-32"></div>
                  </div>
                  <div className="h-8 bg-muted rounded w-16"></div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-8 bg-muted rounded w-28"></div>
                    <div className="h-4 bg-muted rounded w-24"></div>
                  </div>
                  <div className="h-4 w-24" />
                </div>
              </div>
            ) : (
              <EnhancedLivePriceDisplay
                symbol={selectedAsset.symbol}
                assetName={selectedAsset.name}
                onUseCurrentPrice={handleUseCurrentPrice}
                className="w-full mb-4"
              />
            )}
          </div>
        )}

        {/* Initial State Helper */}
        {!selectedAsset && (
          <div className="w-full p-6 bg-muted/30 border border-dashed border-border rounded-lg text-center">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Select an asset above to view live pricing and create your signal</p>
              <p className="text-xs text-muted-foreground">Real-time price data will appear here once you choose an asset</p>
            </div>
          </div>
        )}

        {/* Trade Type & Entry Price Row */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Trade Type */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-foreground">Trade Type</label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm p-3 bg-popover border border-border">
                    <div className="space-y-2 text-sm">
                      <div><strong>Market Orders:</strong></div>
                      <div>• <strong>Buy:</strong> Execute immediately at current market price</div>
                      <div>• <strong>Sell:</strong> Execute immediately at current market price</div>
                      <div><strong>Limit Orders:</strong></div>
                      <div>• <strong>Buy Limit:</strong> Buy when price drops to or below entry price</div>
                      <div>• <strong>Sell Limit:</strong> Sell when price rises to or above entry price</div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Select 
              value={formData.trade_type} 
              onValueChange={(value) => handleInputChange('trade_type', value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border z-50">
                <SelectItem value="buy" className="hover:bg-accent">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span>Buy</span>
                    <Badge variant="secondary" className="text-xs">Market</Badge>
                  </div>
                </SelectItem>
                <SelectItem value="sell" className="hover:bg-accent">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-red-500" />
                    <span>Sell</span>
                    <Badge variant="secondary" className="text-xs">Market</Badge>
                  </div>
                </SelectItem>
                <SelectItem value="buy_limit" className="hover:bg-accent">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span>Buy Limit</span>
                    <Badge variant="outline" className="text-xs">Pending</Badge>
                  </div>
                </SelectItem>
                <SelectItem value="sell_limit" className="hover:bg-accent">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-red-500" />
                    <span>Sell Limit</span>
                    <Badge variant="outline" className="text-xs">Pending</Badge>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            
            {/* Limit Order Status Badge */}
            {(formData.trade_type === 'buy_limit' || formData.trade_type === 'sell_limit') && (
              <div className="flex items-center gap-2 mt-2 p-2 bg-muted/50 rounded-md border border-border">
                <Clock className="w-4 h-4 text-blue-500" />
                <div className="text-sm">
                  <div className="font-medium text-foreground">
                    {formData.trade_type === 'buy_limit' ? 'Buy Limit Order' : 'Sell Limit Order'}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {formData.trade_type === 'buy_limit' 
                      ? 'Will execute when price drops to or below entry price'
                      : 'Will execute when price rises to or above entry price'
                    }
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Entry Price */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-foreground">Entry Price</label>
              {(formData.trade_type === 'buy_limit' || formData.trade_type === 'sell_limit') && (
                <Badge variant="outline" className="text-xs">
                  Activation Price
                </Badge>
              )}
            </div>
            <Input
              type="number"
              step="0.01"
              placeholder={
                formData.trade_type === 'buy_limit' ? 'Price to buy at (below current)' :
                formData.trade_type === 'sell_limit' ? 'Price to sell at (above current)' :
                '0.00'
              }
              value={formData.entry_price}
              onChange={(e) => handleInputChange('entry_price', e.target.value)}
              className={`w-full ${errors.entry_price ? 'border-red-500' : ''}`}
            />
            {errors.entry_price && (
              <p className="text-sm text-red-500">{errors.entry_price}</p>
            )}
            
            {/* Price Relationship Validation Feedback */}
            {selectedAsset && formData.entry_price && (
              <div className="text-xs text-muted-foreground">
                {formData.trade_type === 'buy_limit' && (
                  <span>💡 Buy Limit should be below current market price</span>
                )}
                {formData.trade_type === 'sell_limit' && (
                  <span>💡 Sell Limit should be above current market price</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Split Price & Pip Calculator */}
        <div className="w-full p-4 bg-card border border-border rounded-lg">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left Side - Price Inputs */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-semibold text-foreground">Price Levels</h3>
                <Badge variant="secondary" className="text-xs">Direct Entry</Badge>
              </div>
              
              {/* Stop Loss */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Stop Loss</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.stop_loss}
                  onChange={(e) => handleStopLossChange(e.target.value)}
                  className={`w-full ${errors.stop_loss ? 'border-red-500' : ''}`}
                />
                {errors.stop_loss && (
                  <p className="text-sm text-red-500">{errors.stop_loss}</p>
                )}
              </div>

              {/* Take Profits */}
              <div className="space-y-2">
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
            </div>

            {/* Right Side - Pip Calculator */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <Calculator className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Pip Calculator</h3>
                <Badge variant="outline" className="text-xs">Auto-Sync</Badge>
              </div>
              
              {/* Stop Loss Pips */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Stop Loss (Pips)</label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="0.0"
                  value={pipInputs.stop_loss_pips}
                  onChange={(e) => handlePipChange('stop_loss_pips', e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Take Profit Pips */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Take Profits (Pips)</label>
                
                {takeProfits.map((_, index) => (
                  <div key={index} className="flex items-center gap-2 w-full">
                    <Input
                      type="number"
                      step="0.1"
                      placeholder={`TP${index + 1} pips`}
                      value={pipInputs[`tp${index + 1}_pips` as keyof typeof pipInputs]}
                      onChange={(e) => handlePipChange(`tp${index + 1}_pips`, e.target.value)}
                      className="flex-1"
                    />
                    
                  </div>
                ))}
                
              </div>

              {/* Pip Info */}
              {selectedAsset && (
                <div className="p-3 bg-muted/30 rounded-md border border-border">
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div className="font-medium">Pip Information for {selectedAsset.name}:</div>
                    <div>• Changes sync automatically between price and pip inputs</div>
                    <div>• Based on standard pip sizes for this asset type</div>
                  </div>
                </div>
              )}
            </div>
          </div>
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
