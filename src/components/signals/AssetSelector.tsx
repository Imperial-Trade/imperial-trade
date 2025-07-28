
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface AssetOption {
  symbol: string;
  name: string;
  category: 'crypto' | 'commodities';
}

const SUPPORTED_ASSETS: AssetOption[] = [
  { symbol: 'GOLD', name: 'Gold', category: 'commodities' },
  { symbol: 'BTC/USD', name: 'Bitcoin', category: 'crypto' }
];

interface AssetSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  onAssetChange?: (asset: AssetOption) => void;
}

export const AssetSelector: React.FC<AssetSelectorProps> = ({
  value,
  onValueChange,
  onAssetChange
}) => {
  const handleValueChange = (newValue: string) => {
    onValueChange(newValue);
    const selectedAsset = SUPPORTED_ASSETS.find(asset => asset.symbol === newValue);
    if (selectedAsset && onAssetChange) {
      onAssetChange(selectedAsset);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">
        Asset
      </label>
      
      <Select value={value} onValueChange={handleValueChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select an asset..." />
        </SelectTrigger>
        <SelectContent>
          {SUPPORTED_ASSETS.map((asset) => (
            <SelectItem key={asset.symbol} value={asset.symbol}>
              <div className="flex items-center justify-between w-full">
                <span className="font-medium">{asset.name} {asset.symbol}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export { SUPPORTED_ASSETS };
