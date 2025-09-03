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
import { useToast } from '@/components/ui/use-toast';
import type { TradeAlertSubmissionData } from '@/hooks/useOptimizedTradeAlertForm';
import { 
  calculatePipsFromPrice, 
  calculatePriceFromPips, 
  formatPips, 
  getDirectionFromTradeType,
  getPipSize 
} from '@/utils/pipCalculations';

// Asset cards for the two allowed symbols
const ALLOWED_ASSETS = [
  { symbol: 'XAUUSD', name: 'Gold' },
  { symbol: 'BTCUSD', name: 'Bitcoin' }
];

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
  const [selectedAsset, setSelectedAsset] = useState<typeof ALLOWED_ASSETS[0] | null>(null);
  const [isLoadingPriceData, setIsLoadingPriceData] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  
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

  const handleAssetSelection = useCallback((symbol: string) => {
    const asset = ALLOWED_ASSETS.find(a => a.symbol === symbol);
    if (!asset) return;
    
    setIsLoadingPriceData(true);
    setSelectedAsset(asset);
    setFormData(prev => ({
      ...prev,
      asset_name: asset.name,
      tradermade_symbol: asset.symbol,
      // Reset price-related fields when switching assets
      entry_price: '',
      stop_loss: '',
      tp1: '',
      tp2: '',
      tp3: '',
      tp4: '',
      tp5: ''
    }));
    
    // Reset take profits array
    setTakeProfits(['']);
    
    // Reset pip inputs
    setPipInputs({
      stop_loss_pips: '',
      tp1_pips: '',
      tp2_pips: '',
      tp3_pips: '',
      tp4_pips: '',
      tp5_pips: ''
    });
    
    // Clear all validation errors to avoid stale errors when switching assets
    setErrors({});

    // Reset current price when switching assets
    setCurrentPrice(0);
    
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

    // Parse numeric values safely
    const entryPrice = formData.entry_price ? parseFloat(formData.entry_price) : NaN;
    const stopLoss = formData.stop_loss ? parseFloat(formData.stop_loss) : NaN;
    const tp1Val = takeProfits[0] ? parseFloat(takeProfits[0]) : NaN;

    if (formData.entry_price) {
      if (isNaN(entryPrice) || entryPrice <= 0) {
        newErrors.entry_price = 'Entry price must be a positive number';
      }
    }

    if (formData.stop_loss) {
      if (isNaN(stopLoss) || stopLoss <= 0) {
        newErrors.stop_loss = 'Stop loss must be a positive number';
      }
    }

    if (takeProfits[0]) {
      if (isNaN(tp1Val) || tp1Val <= 0) {
        newErrors.tp1 = 'Take profit must be a positive number';
      }
    }

    // Directional checks (independent from live price)
    if (!isNaN(entryPrice) && !isNaN(stopLoss)) {
      const isBuySide = formData.trade_type === 'buy' || formData.trade_type === 'buy_limit';
      if (isBuySide && !(stopLoss < entryPrice)) {
        newErrors.stop_loss = 'For Buy/Buy Limit, Stop Loss must be below Entry';
      }
      if (!isBuySide && !(stopLoss > entryPrice)) {
        newErrors.stop_loss = 'For Sell/Sell Limit, Stop Loss must be above Entry';
      }
      // Minimum SL distance from entry
      if (selectedAsset) {
        const pipSize = getPipSize(selectedAsset.symbol);
        const minSlDistance = pipSize * 1; // 1 pip minimum
        if (Math.abs(entryPrice - stopLoss) < minSlDistance) {
          newErrors.stop_loss = `Stop Loss too close to Entry (min ${formatPips(minSlDistance / pipSize)} pips)`;
        }
      }
    }

    if (!isNaN(entryPrice) && !isNaN(tp1Val)) {
      const isBuySide = formData.trade_type === 'buy' || formData.trade_type === 'buy_limit';
      if (isBuySide && !(tp1Val > entryPrice)) {
        newErrors.tp1 = 'For Buy/Buy Limit, TP1 must be above Entry';
      }
      if (!isBuySide && !(tp1Val < entryPrice)) {
        newErrors.tp1 = 'For Sell/Sell Limit, TP1 must be below Entry';
      }
    }

    // Live market dependent checks (only when we have a fresh price)
    if (selectedAsset && currentPrice > 0 && !isNaN(entryPrice)) {
      const pipSize = getPipSize(selectedAsset.symbol);
      const minDistance = pipSize * 5; // minimum distance from market for pending orders (5 pips default)
      const slippage = pipSize * 2;    // allowed slippage for market orders (±2 pips default)

      if (formData.trade_type === 'buy_limit') {
        if (entryPrice >= currentPrice) {
          newErrors.entry_price = 'Buy Limit must be BELOW current market price';
        } else if ((currentPrice - entryPrice) < minDistance) {
          newErrors.entry_price = `Buy Limit too close to market (min ${formatPips(minDistance / pipSize)} pips)`;
        }
      }

      if (formData.trade_type === 'sell_limit') {
        if (entryPrice <= currentPrice) {
          newErrors.entry_price = 'Sell Limit must be ABOVE current market price';
        } else if ((entryPrice - currentPrice) < minDistance) {
          newErrors.entry_price = `Sell Limit too close to market (min ${formatPips(minDistance / pipSize)} pips)`;
        }
      }

      if (formData.trade_type === 'buy' || formData.trade_type === 'sell') {
        const diff = Math.abs(entryPrice - currentPrice);
        if (diff > slippage) {
          const allowedPips = slippage / pipSize;
          const actualPips = diff / pipSize;
          newErrors.entry_price = `Entry outside slippage tolerance (±${formatPips(allowedPips)} pips, current diff ${formatPips(actualPips)} pips)`;
        }
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
    <div className="w-full p-4 bg-card rounded-lg border border-border">
      <form onSubmit={handleSubmit} className="w-full space-y-3">
        {/* Asset Selection - Dropdown */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium">Asset</label>
          <Select 
            value={selectedAsset?.symbol || ''} 
            onValueChange={handleAssetSelection}
          >
            <SelectTrigger className="w-full h-8 text-sm">
              <SelectValue placeholder="Select an asset..." />
            </SelectTrigger>
            <SelectContent className="z-50 bg-popover">
              {ALLOWED_ASSETS.map((asset) => (
                <SelectItem key={asset.symbol} value={asset.symbol} className="text-sm">
                  {asset.name} ({asset.symbol})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!selectedAsset && (
            <p className="text-xs text-muted-foreground">Please select an asset to continue</p>
          )}
        </div>

        {/* Live Price Display */}
        {selectedAsset ? (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              Live Price - {selectedAsset.name}
            </label>
            
            <div className="p-3 bg-muted/30 rounded-lg">
              <EnhancedLivePriceDisplay 
                symbol={selectedAsset.symbol}
                assetName={selectedAsset.name}
                onPriceUpdate={setCurrentPrice}
                onUseCurrentPrice={handleUseCurrentPrice}
              />
            </div>
            
            {isLoadingPriceData && (
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading price data...
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              Live Price
            </label>
            <div className="p-3 bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/20">
              <div className="text-center text-muted-foreground text-xs">
                Select an asset to load live price.
              </div>
            </div>
          </div>
        )}

        {/* Trade Type Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">
            Trade Type
          </label>
          
          <Select 
            value={formData.trade_type} 
            onValueChange={(value) => handleInputChange('trade_type', value)}
          >
            <SelectTrigger className="w-full h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="buy" className="text-sm">Market Buy</SelectItem>
              <SelectItem value="sell" className="text-sm">Market Sell</SelectItem>
              <SelectItem value="buy_limit" className="text-sm">Buy Limit</SelectItem>
              <SelectItem value="sell_limit" className="text-sm">Sell Limit</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Entry Price */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">
            Entry Price *
          </label>
          
          <Input
            type="number"
            step="0.00001"
            value={formData.entry_price}
            onChange={(e) => handleInputChange('entry_price', e.target.value)}
            placeholder="Entry price"
            className={`h-8 text-sm ${errors.entry_price ? 'border-destructive' : ''}`}
          />
          
          {errors.entry_price && (
            <Alert variant="destructive" className="py-1.5">
              <AlertTriangle className="h-3 w-3" />
              <AlertDescription className="text-xs">{errors.entry_price}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Stop Loss */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
            Stop Loss *
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Risk management level. Trade closes if price reaches this level.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </label>
          
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <Input
                type="number"
                step="0.00001"
                value={formData.stop_loss}
                onChange={(e) => handleStopLossChange(e.target.value)}
                placeholder="Stop loss price"
                className={`h-8 text-sm ${errors.stop_loss ? 'border-destructive' : ''}`}
              />
              <div className="text-xs text-muted-foreground mt-0.5">Price</div>
            </div>
            <div>
              <Input
                type="number"
                step="0.1"
                value={pipInputs.stop_loss_pips}
                onChange={(e) => handlePipChange('stop_loss_pips', e.target.value)}
                placeholder="Pips from entry"
                className="text-right h-8 text-sm"
              />
              <div className="text-xs text-muted-foreground mt-0.5 text-right">Pips</div>
            </div>
          </div>
          
          {errors.stop_loss && (
            <Alert variant="destructive" className="py-1.5">
              <AlertTriangle className="h-3 w-3" />
              <AlertDescription className="text-xs">{errors.stop_loss}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Take Profits */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
              Take Profit Levels *
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Profit targets. At least TP1 is required.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </label>
            
            {takeProfits.length < 5 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addTakeProfit}
                className="text-xs h-6 px-2"
              >
                <Plus className="h-2.5 w-2.5 mr-1" />
                Add TP
              </Button>
            )}
          </div>
          
          <div className="space-y-1.5">
            {takeProfits.map((tp, index) => (
              <div key={index} className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-xs min-w-[32px] h-6">
                    TP{index + 1}
                  </Badge>
                  
                  <div className="grid grid-cols-2 gap-1.5 flex-1">
                    <div>
                      <Input
                        type="number"
                        step="0.00001"
                        value={tp}
                        onChange={(e) => handleTakeProfitChange(index, e.target.value)}
                        placeholder={`TP${index + 1} price`}
                        className={`h-8 text-sm ${errors[`tp${index + 1}`] ? 'border-destructive' : ''}`}
                      />
                    </div>
                    <div>
                      <Input
                        type="number"
                        step="0.1"
                        value={pipInputs[`tp${index + 1}_pips` as keyof typeof pipInputs]}
                        onChange={(e) => handlePipChange(`tp${index + 1}_pips`, e.target.value)}
                        placeholder="Pips"
                        className="text-right h-8 text-sm"
                      />
                    </div>
                  </div>
                  
                  {index > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTakeProfit(index)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                {errors[`tp${index + 1}`] && (
                  <Alert variant="destructive" className="py-1.5">
                    <AlertTriangle className="h-3 w-3" />
                    <AlertDescription className="text-xs">{errors[`tp${index + 1}`]}</AlertDescription>
                  </Alert>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">
            Notes (Optional)
          </label>
          
          <Textarea
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="Add trade analysis, strategy, or notes..."
            rows={2}
            className="text-sm resize-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-3">
          <Button 
            type="submit" 
            className="flex-1 h-8 text-sm"
            disabled={isSubmitting || !selectedAsset}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                Creating Signal...
              </>
            ) : selectedAsset ? (
              'Create Signal'
            ) : (
              'Select an asset to continue'
            )}
          </Button>
          
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="h-8 text-sm"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
};

export default OptimizedNewAlertForm;
