
import React from 'react';
import { ASSET_REGISTRY, AssetDefinition } from '@/types/assets';

export interface AssetOption {
  symbol: string;
  name: string;
  category: 'crypto' | 'commodities' | 'forex' | 'indices';
}

// Cost optimization: Only support XAUUSD and BTCUSD for streaming
const SUPPORTED_ASSETS: AssetOption[] = [
  { symbol: 'XAUUSD', name: 'Gold', category: 'commodities' },
  { symbol: 'BTCUSD', name: 'Bitcoin', category: 'crypto' }
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
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">
        Available Assets
      </label>
      
      <div className="p-3 bg-muted/50 rounded-lg border border-border">
        <div className="text-sm text-muted-foreground mb-2">
          Currently streaming live prices for:
        </div>
        <div className="flex gap-2">
          {SUPPORTED_ASSETS.map((asset) => (
            <div 
              key={asset.symbol}
              className="px-3 py-1 bg-primary/10 border border-primary/20 rounded text-sm text-foreground"
            >
              {asset.name} ({asset.symbol})
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export { SUPPORTED_ASSETS };
