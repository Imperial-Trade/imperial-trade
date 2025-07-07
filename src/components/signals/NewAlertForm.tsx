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

const supportedAssets = [
  { name: 'Gold', symbol: 'XAU/USD', category: 'Commodities' },
  { name: 'Bitcoin', symbol: 'BTC/USD', category: 'Crypto' }
];

export default function NewAlertForm({ onSubmit }) {
  const [formData, setFormData] = useState({
    asset_name: '',
    finnhub_symbol: '',
    trade_type: 'buy',
    entry_price: '',
    stop_loss: '',
    notes: '',
  });

  const [takeProfits, setTakeProfits] = useState([{ value: '' }]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({...prev, [name]: value}));
  }

  const handleAssetChange = (symbol) => {
      const asset = supportedAssets.find(a => a.symbol === symbol);
      if (asset) {
          setFormData(prev => ({
              ...prev,
              asset_name: asset.name,
              finnhub_symbol: asset.symbol
          }));
      }
  }

  const addTakeProfit = () => {
    if (takeProfits.length < 10) {
      setTakeProfits([...takeProfits, { value: '' }]);
    }
  };

  const removeTakeProfit = (index) => {
    if (takeProfits.length > 1) {
      const newTPs = takeProfits.filter((_, i) => i !== index);
      setTakeProfits(newTPs);
    }
  };

  const updateTakeProfit = (index, value) => {
    const newTPs = [...takeProfits];
    newTPs[index].value = value;
    setTakeProfits(newTPs);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.finnhub_symbol) {
        alert("Please select an asset.");
        return;
    }

    const isLimitOrder = formData.trade_type === 'buy_limit' || formData.trade_type === 'sell_limit';

    const tpData = {};
    takeProfits.forEach((tp, index) => {
      if (tp.value && parseFloat(tp.value) > 0) {
        tpData[`tp${index + 1}`] = parseFloat(tp.value);
      }
    });

    const numericData = {
        ...formData,
        ...tpData,
        entry_price: parseFloat(formData.entry_price),
        stop_loss: parseFloat(formData.stop_loss),
        status: isLimitOrder ? 'pending' : 'active',
    };
    
    onSubmit(numericData);
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 py-4 text-white">
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

      <div>
        <Label htmlFor="trade_type">Trade Type</Label>
        <Select onValueChange={(value) => handleSelectChange('trade_type', value)} defaultValue="buy" name="trade_type">
          <SelectTrigger className="bg-gray-700 border-gray-600">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700 text-white">
            <SelectItem value="buy">Buy (Market)</SelectItem>
            <SelectItem value="sell">Sell (Market)</SelectItem>
            <SelectItem value="buy_limit">Buy Limit</SelectItem>
            <SelectItem value="sell_limit">Sell Limit</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="entry_price">Entry Price</Label>
        <Input id="entry_price" name="entry_price" type="number" step="any" value={formData.entry_price} onChange={handleChange} required className="bg-gray-700 border-gray-600"/>
      </div>
      
      <div className="col-span-2">
        <Label htmlFor="stop_loss">Stop Loss</Label>
        <Input id="stop_loss" name="stop_loss" type="number" step="any" value={formData.stop_loss} onChange={handleChange} required className="bg-gray-700 border-gray-600"/>
      </div>
      
      <div className="col-span-2">
        <div className="flex items-center justify-between mb-3">
          <Label>Take Profits</Label>
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={addTakeProfit}
            className="bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white"
            disabled={takeProfits.length >= 10}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add TP
          </Button>
        </div>
        
        <div className="space-y-3">
          {takeProfits.map((tp, index) => (
            <div key={index} className="flex items-center gap-2">
              <Label className="w-16 text-sm text-gray-400">TP{index + 1}:</Label>
              <Input
                type="number"
                step="any"
                value={tp.value}
                onChange={(e) => updateTakeProfit(index, e.target.value)}
                placeholder={`Take Profit ${index + 1}`}
                className="bg-gray-700 border-gray-600 flex-1"
              />
              {takeProfits.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeTakeProfit(index)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
       
      <div className="col-span-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" value={formData.notes} onChange={handleChange} className="bg-gray-700 border-gray-600"/>
      </div>

      <div className="col-span-2 text-right">
        <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white">Post Alert</Button>
      </div>
    </form>
  );
}