
import React, { useState } from 'react';
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
import { useTradeAlertForm, type TradeAlertSubmissionData } from '@/hooks/useTradeAlertForm';

const supportedAssets = [
  { name: 'Gold', symbol: 'XAU/USD', category: 'Commodities' },
  { name: 'Bitcoin', symbol: 'BTC/USD', category: 'Crypto' }
];

interface NewAlertFormProps {
  onSubmit: (data: TradeAlertSubmissionData) => Promise<void> | void;
}

export default function NewAlertForm({ onSubmit }: NewAlertFormProps) {
  const [takeProfitCount, setTakeProfitCount] = useState(1);
  
  const { form, handleSubmit, isSubmitting, hasErrors } = useTradeAlertForm({
    onSubmit,
    validateOnChange: true,
    validateOnBlur: true
  });

  const addTakeProfit = () => {
    if (takeProfitCount < 5) {
      setTakeProfitCount(prev => prev + 1);
    }
  };

  const removeTakeProfit = () => {
    if (takeProfitCount > 1) {
      const tpField = `tp${takeProfitCount}` as keyof typeof form.getValues;
      form.setValue(tpField, undefined);
      setTakeProfitCount(prev => prev - 1);
    }
  };

  const handleAssetChange = (symbol: string) => {
    const asset = supportedAssets.find(a => a.symbol === symbol);
    if (asset) {
      form.setValue('asset_name', asset.name);
      form.setValue('finnhub_symbol', asset.symbol);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 py-4 text-white">
        {/* Asset Selection */}
        <div className="col-span-2">
          <Label htmlFor="asset">Asset (Live Twelve Data)</Label>
          <Select onValueChange={handleAssetChange} name="asset">
            <SelectTrigger className="bg-gray-700 border-gray-600">
              <SelectValue placeholder="Select Gold or Bitcoin..." />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700 text-white">
              {supportedAssets.map(asset => (
                <SelectItem key={asset.symbol} value={asset.symbol}>
                  <div className="flex items-center justify-between w-full">
                    <span>{asset.name}</span>
                    <span className="text-xs text-emerald-400 ml-2">{asset.symbol}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Trade Type */}
        <FormField
          control={form.control}
          name="trade_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white">Trade Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="bg-gray-700 border-gray-600">
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
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Entry Price */}
        <FormField
          control={form.control}
          name="entry_price"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white">Entry Price</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  step="any"
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  className="bg-gray-700 border-gray-600"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Stop Loss */}
        <div className="col-span-2">
          <FormField
            control={form.control}
            name="stop_loss"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white">Stop Loss</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    step="any"
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    className="bg-gray-700 border-gray-600"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        {/* Take Profits */}
        <div className="col-span-2">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-white">Take Profits</Label>
            <div className="flex gap-2">
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={addTakeProfit}
                className="bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white"
                disabled={takeProfitCount >= 5}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add TP
              </Button>
              {takeProfitCount > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={removeTakeProfit}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
          
          <div className="space-y-3">
            {Array.from({ length: takeProfitCount }, (_, index) => {
              const tpField = `tp${index + 1}` as const;
              return (
                <FormField
                  key={tpField}
                  control={form.control}
                  name={tpField}
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <Label className="w-16 text-sm text-gray-400">TP{index + 1}:</Label>
                        <FormControl>
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
                            className="bg-gray-700 border-gray-600 flex-1"
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              );
            })}
          </div>
        </div>
         
        {/* Notes */}
        <div className="col-span-2">
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white">Notes</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value || ''}
                    className="bg-gray-700 border-gray-600"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Submit Button */}
        <div className="col-span-2 text-right">
          <Button 
            type="submit" 
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
            disabled={isSubmitting || hasErrors}
          >
            {isSubmitting ? 'Posting...' : 'Post Alert'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
