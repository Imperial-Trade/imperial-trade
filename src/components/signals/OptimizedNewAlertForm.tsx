
import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, X } from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useOptimizedTradeAlertForm, type TradeAlertSubmissionData } from '@/hooks/useOptimizedTradeAlertForm';
import EnhancedLivePriceDisplay from './EnhancedLivePriceDisplay';

const supportedAssets = [
  { name: 'Gold', symbol: 'XAU/USD', category: 'Commodities' },
  { name: 'Bitcoin', symbol: 'BTC/USD', category: 'Crypto' }
];

interface OptimizedNewAlertFormProps {
  onSubmit: (data: TradeAlertSubmissionData) => Promise<void> | void;
  onCancel?: () => void;
}

export default function OptimizedNewAlertForm({ onSubmit, onCancel }: OptimizedNewAlertFormProps) {
  const [takeProfitCount, setTakeProfitCount] = useState(1);
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [selectedAssetName, setSelectedAssetName] = useState('');
  
  // Use optimized form hook with smart validation
  const { form, handleSubmit, isSubmitting, hasErrors } = useOptimizedTradeAlertForm({
    onSubmit,
    enableSmartValidation: true
  });

  // Memoized handlers to prevent unnecessary re-renders
  const addTakeProfit = useCallback(() => {
    if (takeProfitCount < 5) {
      setTakeProfitCount(prev => prev + 1);
    }
  }, [takeProfitCount]);

  const removeTakeProfit = useCallback(() => {
    if (takeProfitCount > 1) {
      const tpFieldName = `tp${takeProfitCount}` as 'tp1' | 'tp2' | 'tp3' | 'tp4' | 'tp5';
      form.setValue(tpFieldName, undefined);
      setTakeProfitCount(prev => prev - 1);
    }
  }, [takeProfitCount, form]);

  const handleAssetChange = useCallback((symbol: string) => {
    const asset = supportedAssets.find(a => a.symbol === symbol);
    if (asset) {
      form.setValue('asset_name', asset.name);
      form.setValue('finnhub_symbol', asset.symbol);
      setSelectedSymbol(symbol);
      setSelectedAssetName(asset.name);
    }
  }, [form]);

  const handleUseCurrentPrice = useCallback((price: number) => {
    form.setValue('entry_price', price, { shouldValidate: true });
  }, [form]);

  // Memoized take profit fields to prevent re-rendering
  const takeProfitFields = useMemo(() => {
    return Array.from({ length: takeProfitCount }, (_, index) => {
      const tpField = `tp${index + 1}` as 'tp1' | 'tp2' | 'tp3' | 'tp4' | 'tp5';
      return (
        <FormField
          key={tpField}
          control={form.control}
          name={tpField}
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-3">
                <Label className="w-12 text-sm text-gray-300 font-medium">
                  TP{index + 1}:
                </Label>
                <FormControl className="flex-1">
                  <Input
                    {...field}
                    type="number"
                    step="any"
                    value={field.value || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(value ? parseFloat(value) : undefined);
                    }}
                    placeholder={`Take Profit ${index + 1}`}
                    className="bg-gray-700 border-gray-600 text-white h-10 font-mono"
                  />
                </FormControl>
              </div>
              <FormMessage className="text-red-400 ml-15" />
            </FormItem>
          )}
        />
      );
    });
  }, [takeProfitCount, form.control]);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <Form {...form}>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Asset Selection */}
          <div className="space-y-3">
            <Label htmlFor="asset" className="text-white text-sm font-medium">
              Asset (Optimized Live Data)
            </Label>
            <Select onValueChange={handleAssetChange} name="asset">
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white h-11">
                <SelectValue placeholder="Select Gold or Bitcoin..." />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700 text-white">
                {supportedAssets.map(asset => (
                  <SelectItem key={asset.symbol} value={asset.symbol}>
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium">{asset.name}</span>
                      <span className="text-xs text-accent-green ml-3">{asset.symbol}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Enhanced Live Price Display with smart controls */}
            {selectedSymbol && (
              <EnhancedLivePriceDisplay 
                symbol={selectedSymbol} 
                assetName={selectedAssetName}
                onUseCurrentPrice={handleUseCurrentPrice}
              />
            )}
          </div>

          {/* Trade Type and Entry Price Row */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="trade_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white text-sm font-medium">Trade Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white h-11">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-gray-800 border-gray-700 text-white">
                      <SelectItem value="buy">Buy (Market)</SelectItem>
                      <SelectItem value="sell">Sell (Market)</SelectItem>
                      <SelectItem value="buy_limit">Buy Limit</SelectItem>
                      <SelectItem value="sell_limit">Sell Limit</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="entry_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white text-sm font-medium">Entry Price</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      step="any"
                      placeholder="0.00"
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      className="bg-gray-700 border-gray-600 text-white h-11 font-mono"
                    />
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />
          </div>
          
          {/* Stop Loss - Full Width */}
          <FormField
            control={form.control}
            name="stop_loss"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white text-sm font-medium">Stop Loss</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    step="any"
                    placeholder="0.00"
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    className="bg-gray-700 border-gray-600 text-white h-11 font-mono"
                  />
                </FormControl>
                <FormMessage className="text-red-400" />
              </FormItem>
            )}
          />
          
          {/* Take Profits Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-white text-sm font-medium">Take Profits</Label>
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={addTakeProfit}
                  className="bg-accent-green hover:bg-accent-green/80 border-accent-green text-white h-8 px-3 text-xs"
                  disabled={takeProfitCount >= 5}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add TP
                </Button>
                {takeProfitCount > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeTakeProfit}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/20 h-8 px-2"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
            
            <div className="space-y-3">
              {takeProfitFields}
            </div>
          </div>
         
          {/* Notes */}
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white text-sm font-medium">Notes</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value || ''}
                    placeholder="Add any additional notes or comments..."
                    className="bg-gray-700 border-gray-600 text-white min-h-[80px] resize-none"
                  />
                </FormControl>
                <FormMessage className="text-red-400" />
              </FormItem>
            )}
          />

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-600">
            {onCancel && (
              <Button 
                type="button"
                variant="outline"
                onClick={onCancel}
                className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
              >
                Cancel
              </Button>
            )}
            <Button 
              type="submit" 
              className="bg-accent-green hover:bg-accent-green/80 text-white min-w-[120px]"
              disabled={isSubmitting || hasErrors}
            >
              {isSubmitting ? 'Posting...' : 'Post Signal'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
