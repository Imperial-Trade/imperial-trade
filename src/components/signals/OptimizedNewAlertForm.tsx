import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputWithSuffix } from '@/components/ui/input-with-suffix';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, AlertTriangle, Plus, X, Info, Clock, TrendingUp, TrendingDown, Calculator } from 'lucide-react';
import EnhancedLivePriceDisplay from './EnhancedLivePriceDisplay';
import { useOptimizedWebSocketPrices } from '@/contexts/OptimizedWebSocketPriceContext';
import { useSignalTheme } from '@/hooks/useSignalTheme';

import { useToast } from '@/hooks/use-toast';
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
  const { refreshPrice } = useOptimizedWebSocketPrices(); // 🔥 For manual cache-busting
  const { colors } = useSignalTheme();
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

  const handleAssetSelection = useCallback(async (symbol: string) => {
    const asset = ALLOWED_ASSETS.find(a => a.symbol === symbol);
    if (!asset) return;
    
    // 🔥 AGGRESSIVE CACHE-BUSTING: Force fresh price fetch on modal open
    console.log(`🔥 [Cache-Bust] Forcing fresh price fetch for ${asset.symbol}`);
    refreshPrice(asset.symbol); // Force immediate refresh bypassing cache
    
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

    // Reset current price when switching assets to ensure clean state
    setCurrentPrice(0);
    
    // Smart cache cleaning: only remove invalid entries, preserve valid ones
    try {
      import('@/utils/priceGuards').then(({ cleanInvalidPriceCache }) => {
        cleanInvalidPriceCache([asset.symbol]); // Only clean this symbol's cache if invalid
        console.log(`🧹 [${asset.symbol}] Smart cache validation completed`);
      }).catch((e) => {
        console.warn('Failed to validate cache:', e);
      });
    } catch (e) {
      console.warn('Failed to import cache validator:', e);
    }
    
    // Reset loading state after a short delay to allow the price component to initialize
    setTimeout(() => {
      setIsLoadingPriceData(false);
    }, 1500);
  }, [refreshPrice]);

  // Centralized helper to recalculate SL/TP prices from pip inputs
  const recalcTargetsFromPips = useCallback((
    entryPrice: number,
    tradeType: 'buy' | 'sell' | 'buy_limit' | 'sell_limit',
    assetSymbol: string,
    currentPipInputs: typeof pipInputs,
    currentTakeProfits: string[]
  ) => {
    if (!entryPrice || isNaN(entryPrice) || entryPrice <= 0) return { stopLoss: '', takeProfits: currentTakeProfits };

    let newStopLoss = '';
    const newTakeProfits = [...currentTakeProfits];
    const getDecimalPlaces = (symbol: string) => symbol === 'BTCUSD' || symbol === 'XAUUSD' ? 2 : 5;
    const decimals = getDecimalPlaces(assetSymbol);

    // Recalculate stop loss if stop loss pips exist
    if (currentPipInputs.stop_loss_pips) {
      const stopLossPips = parseFloat(currentPipInputs.stop_loss_pips);
      if (!isNaN(stopLossPips) && stopLossPips > 0) {
        const direction = getDirectionFromTradeType(tradeType, 'stop_loss');
        const calculatedStopLoss = calculatePriceFromPips(entryPrice, stopLossPips, assetSymbol, direction);
        newStopLoss = calculatedStopLoss.toFixed(decimals);
      }
    }

    // Recalculate take profits if take profit pips exist
    ['tp1_pips', 'tp2_pips', 'tp3_pips', 'tp4_pips', 'tp5_pips'].forEach((pipField, index) => {
      const pipValue = currentPipInputs[pipField as keyof typeof currentPipInputs];
      if (pipValue && index < currentTakeProfits.length) {
        const tpPips = parseFloat(pipValue);
        if (!isNaN(tpPips) && tpPips > 0) {
          const direction = getDirectionFromTradeType(tradeType, 'take_profit');
          const calculatedPrice = calculatePriceFromPips(entryPrice, tpPips, assetSymbol, direction);
          newTakeProfits[index] = calculatedPrice.toFixed(decimals);
        }
      }
    });

    return { stopLoss: newStopLoss, takeProfits: newTakeProfits };
  }, []);

  const handleInputChange = useCallback((field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // If entry price changes and we have existing pip values, recalculate prices
    if (field === 'entry_price' && value && selectedAsset) {
      const newEntryPrice = parseFloat(value.toString());
      if (!isNaN(newEntryPrice)) {
        const { stopLoss, takeProfits: newTPs } = recalcTargetsFromPips(
          newEntryPrice, 
          formData.trade_type, 
          selectedAsset.symbol, 
          pipInputs, 
          takeProfits
        );
        
        if (stopLoss) {
          setFormData(prev => ({ ...prev, stop_loss: stopLoss }));
        }
        
        if (newTPs.some(tp => tp !== '')) {
          setTakeProfits(newTPs);
          const tpKeys = ['tp1', 'tp2', 'tp3', 'tp4', 'tp5'];
          const updates: Record<string, string> = {};
          newTPs.forEach((tp, index) => {
            if (tp && index < tpKeys.length) {
              updates[tpKeys[index]] = tp;
            }
          });
          setFormData(prev => ({ ...prev, ...updates }));
        }
      }
    }

    // If trade type changes, recalculate all targets from pips
    if (field === 'trade_type' && formData.entry_price && selectedAsset) {
      const entryPrice = parseFloat(formData.entry_price);
      if (!isNaN(entryPrice)) {
        const { stopLoss, takeProfits: newTPs } = recalcTargetsFromPips(
          entryPrice, 
          value as 'buy' | 'sell' | 'buy_limit' | 'sell_limit', 
          selectedAsset.symbol, 
          pipInputs, 
          takeProfits
        );
        
        if (stopLoss) {
          setFormData(prev => ({ ...prev, stop_loss: stopLoss }));
        }
        
        if (newTPs.some(tp => tp !== '')) {
          setTakeProfits(newTPs);
          const tpKeys = ['tp1', 'tp2', 'tp3', 'tp4', 'tp5'];
          const updates: Record<string, string> = {};
          newTPs.forEach((tp, index) => {
            if (tp && index < tpKeys.length) {
              updates[tpKeys[index]] = tp;
            }
          });
          setFormData(prev => ({ ...prev, ...updates }));
        }
      }
    }
    
    // Clear field-specific errors
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [errors, selectedAsset, formData.trade_type, formData.entry_price, pipInputs, takeProfits, recalcTargetsFromPips]);

  // 🚀 ANTI-CHURN: Stable callbacks with useCallback to prevent EnhancedLivePriceDisplay re-renders
  const handlePriceUpdate = useCallback((price: number) => {
    setCurrentPrice(price);
  }, []);

  const handleUseCurrentPrice = useCallback((price: number) => {
    const priceStr = price.toString();
    setFormData(prev => ({ ...prev, entry_price: priceStr }));
    
    // Immediately recalculate targets if we have pip inputs and selected asset
    if (selectedAsset) {
      const { stopLoss, takeProfits: newTPs } = recalcTargetsFromPips(
        price, 
        formData.trade_type, 
        selectedAsset.symbol, 
        pipInputs, 
        takeProfits
      );
      
      if (stopLoss) {
        setFormData(prev => ({ ...prev, stop_loss: stopLoss }));
      }
      
      if (newTPs.some(tp => tp !== '')) {
        setTakeProfits(newTPs);
        const tpKeys = ['tp1', 'tp2', 'tp3', 'tp4', 'tp5'];
        const updates: Record<string, string> = {};
        newTPs.forEach((tp, index) => {
          if (tp && index < tpKeys.length) {
            updates[tpKeys[index]] = tp;
          }
        });
        setFormData(prev => ({ ...prev, ...updates }));
      }
    }
    
    toast({
      title: "Price Updated", 
      description: `Entry price set to $${price.toFixed(2)}`,
    });
  }, [selectedAsset, formData.trade_type, pipInputs, takeProfits, recalcTargetsFromPips, toast]);

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
    
    if (pips && formData.entry_price && selectedAsset) {
      const entryPrice = parseFloat(formData.entry_price);
      const pipValue = parseFloat(pips);
      
      if (!isNaN(entryPrice) && !isNaN(pipValue) && pipValue > 0) {
        const getDecimalPlaces = (symbol: string) => symbol === 'BTCUSD' || symbol === 'XAUUSD' ? 2 : 5;
        const decimals = getDecimalPlaces(selectedAsset.symbol);
        
        let direction: 'up' | 'down' = 'up';
        let targetType: 'stop_loss' | 'take_profit' = 'take_profit';
        
        if (field === 'stop_loss_pips') {
          targetType = 'stop_loss';
        }
        
        direction = getDirectionFromTradeType(formData.trade_type, targetType);
        const calculatedPrice = calculatePriceFromPips(entryPrice, pipValue, selectedAsset.symbol, direction);
        
        if (field === 'stop_loss_pips') {
          setFormData(prev => ({ ...prev, stop_loss: calculatedPrice.toFixed(decimals) }));
        } else {
          const tpIndex = parseInt(field.replace('tp', '').replace('_pips', '')) - 1;
          if (tpIndex >= 0 && tpIndex < takeProfits.length) {
            const newTPs = [...takeProfits];
            newTPs[tpIndex] = calculatedPrice.toFixed(decimals);
            setTakeProfits(newTPs);
            
            const tpKeys = ['tp1', 'tp2', 'tp3', 'tp4', 'tp5'];
            setFormData(prev => ({
              ...prev,
              [tpKeys[tpIndex]]: calculatedPrice.toFixed(decimals)
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
    <div className="bg-card rounded-lg border border-border">
      <form onSubmit={handleSubmit} className="p-2 sm:p-3 space-y-2">
        {/* Asset Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Asset</label>
          <Select 
            value={selectedAsset?.symbol || ''} 
            onValueChange={handleAssetSelection}
          >
            <SelectTrigger className="w-full h-9 bg-input border-border">
              <SelectValue placeholder="Select asset to analyze" />
            </SelectTrigger>
            <SelectContent>
              {ALLOWED_ASSETS.map((asset) => (
                <SelectItem key={asset.symbol} value={asset.symbol}>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{asset.name}</span>
                    <span className="text-muted-foreground">({asset.symbol})</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.asset_name && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              {errors.asset_name}
            </p>
          )}
        </div>

        {/* Live Price Display */}
        {!selectedAsset ? (
          <div className="p-3 bg-muted/30 rounded-lg border border-border">
            <p className="text-sm text-muted-foreground text-center">
              Select an asset above to view live pricing and real-time price data
            </p>
          </div>
        ) : (
          <>
            <div className="p-3 bg-muted/30 rounded-lg border border-border">
              <EnhancedLivePriceDisplay
                symbol={selectedAsset.symbol}
                assetName={selectedAsset.name}
                onPriceUpdate={handlePriceUpdate}
                onUseCurrentPrice={handleUseCurrentPrice}
              />
            </div>
          </>
        )}

        {/* Trade Type and Entry Price - Side by Side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Trade Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              Trade Type
              <Info className="w-4 h-4 text-muted-foreground" />
            </label>
            <Select 
              value={formData.trade_type} 
              onValueChange={(value) => handleInputChange('trade_type', value)}
            >
              <SelectTrigger className="h-9 bg-input border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="buy">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-accent-green" />
                    <span>Buy Market</span>
                  </div>
                </SelectItem>
                <SelectItem value="sell">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-destructive" />
                    <span>Sell Market</span>
                  </div>
                </SelectItem>
                <SelectItem value="buy_limit">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-accent-green" />
                    <span>Buy Limit</span>
                  </div>
                </SelectItem>
                <SelectItem value="sell_limit">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-destructive" />
                    <span>Sell Limit</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Entry Price */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Entry Price</label>
            <Input
              type="number"
              step="0.00001"
              value={formData.entry_price}
              onChange={(e) => handleInputChange('entry_price', e.target.value)}
              placeholder="0.00000"
              className="h-9 text-right font-mono bg-input border-border"
            />
            {errors.entry_price && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                {errors.entry_price}
              </p>
            )}
          </div>
        </div>

        {/* Stop Loss and Take Profits */}
        {selectedAsset && (
          <div className="space-y-2">
            {/* Stop Loss */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-destructive">Stop Loss *</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input
                  type="number"
                  step="0.00001"
                  value={formData.stop_loss}
                  onChange={(e) => handleStopLossChange(e.target.value)}
                  placeholder="Price"
                  className="h-7 font-mono text-right bg-input border-border"
                />
                <InputWithSuffix
                  type="number"
                  step="0.1"
                  value={pipInputs.stop_loss_pips}
                  onChange={(e) => handlePipChange('stop_loss_pips', e.target.value)}
                  placeholder="0.0"
                  suffix="Pips"
                  className="h-7 font-mono text-right bg-input border-border"
                />
              </div>
              {errors.stop_loss && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  {errors.stop_loss}
                </p>
              )}
            </div>

            {/* Take Profits */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-accent-green">Take Profits</label>
                {takeProfits.length < 5 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addTakeProfit}
                    className="h-6 px-2 text-xs border-accent-green/30 text-accent-green hover:bg-accent-green/10"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add TP
                  </Button>
                )}
              </div>
              
              {takeProfits.map((tp, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">TP{index + 1}</span>
                    {index > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTakeProfit(index)}
                        className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input
                      type="number"
                      step="0.00001"
                      value={tp}
                      onChange={(e) => handleTakeProfitChange(index, e.target.value)}
                      placeholder="Price"
                      className="h-7 font-mono text-right bg-input border-border"
                    />
                    <InputWithSuffix
                      type="number"
                      step="0.1"
                      value={pipInputs[`tp${index + 1}_pips` as keyof typeof pipInputs] || ''}
                      onChange={(e) => handlePipChange(`tp${index + 1}_pips`, e.target.value)}
                      placeholder="0.0"
                      suffix="Pips"
                      className="h-7 font-mono text-right bg-input border-border"
                    />
                  </div>
                  {index === 0 && errors.tp1 && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" />
                      {errors.tp1}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Educational Notes */}
        <div className="space-y-2">
          <label className="text-xs font-medium">Notes</label>
          <Textarea
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="Share your technical analysis, market context, and educational insights..."
            className="min-h-[44px] resize-none bg-input border-border text-sm p-2"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-3 h-8 text-sm"
          >
            Cancel
          </Button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-9 px-4 rounded-xl flex items-center justify-center transition-all duration-300 ease-out hover:scale-105 active:scale-95 disabled:opacity-50"
            style={{
              background: colors.state.ctaGradient,
              backdropFilter: 'blur(20px) saturate(150%)',
              WebkitBackdropFilter: 'blur(20px) saturate(150%)',
              border: `1px solid ${colors.border.active}`,
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin text-white" />
                <span className="text-sm font-bold text-white">Creating...</span>
              </>
            ) : (
              <span className="text-sm font-bold text-white">Post Signal</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default OptimizedNewAlertForm;