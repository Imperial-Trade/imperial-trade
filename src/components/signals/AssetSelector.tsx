
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

export interface AssetOption {
  symbol: string;
  name: string;
  category: 'stocks' | 'crypto' | 'forex' | 'commodities' | 'etfs';
}

const SUPPORTED_ASSETS: AssetOption[] = [
  // Stocks
  { symbol: 'TSLA', name: 'Tesla Inc', category: 'stocks' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', category: 'stocks' },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF', category: 'stocks' },
  { symbol: 'AAPL', name: 'Apple Inc', category: 'stocks' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', category: 'stocks' },
  { symbol: 'META', name: 'Meta Platforms Inc', category: 'stocks' },
  { symbol: 'GOOGL', name: 'Alphabet Inc', category: 'stocks' },
  { symbol: 'AMZN', name: 'Amazon.com Inc', category: 'stocks' },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co', category: 'stocks' },
  { symbol: 'BAC', name: 'Bank of America Corp', category: 'stocks' },
  { symbol: 'JNJ', name: 'Johnson & Johnson', category: 'stocks' },
  { symbol: 'PFE', name: 'Pfizer Inc', category: 'stocks' },
  { symbol: 'XOM', name: 'Exxon Mobil Corporation', category: 'stocks' },
  { symbol: 'CVX', name: 'Chevron Corporation', category: 'stocks' },
  
  // Crypto
  { symbol: 'BTC/USD', name: 'Bitcoin', category: 'crypto' },
  { symbol: 'ETH/USD', name: 'Ethereum', category: 'crypto' },
  { symbol: 'ADA/USD', name: 'Cardano', category: 'crypto' },
  { symbol: 'SOL/USD', name: 'Solana', category: 'crypto' },
  { symbol: 'MATIC/USD', name: 'Polygon', category: 'crypto' },
  { symbol: 'DOT/USD', name: 'Polkadot', category: 'crypto' },
  
  // Forex
  { symbol: 'EUR/USD', name: 'Euro / US Dollar', category: 'forex' },
  { symbol: 'GBP/USD', name: 'British Pound / US Dollar', category: 'forex' },
  { symbol: 'USD/JPY', name: 'US Dollar / Japanese Yen', category: 'forex' },
  { symbol: 'AUD/USD', name: 'Australian Dollar / US Dollar', category: 'forex' },
  { symbol: 'USD/CAD', name: 'US Dollar / Canadian Dollar', category: 'forex' },
  { symbol: 'NZD/USD', name: 'New Zealand Dollar / US Dollar', category: 'forex' },
  
  // Commodities
  { symbol: 'XAU/USD', name: 'Gold', category: 'commodities' },
  { symbol: 'XAG/USD', name: 'Silver', category: 'commodities' },
  { symbol: 'CRUDE_OIL', name: 'Crude Oil', category: 'commodities' },
  { symbol: 'NATURAL_GAS', name: 'Natural Gas', category: 'commodities' },
  { symbol: 'COPPER', name: 'Copper', category: 'commodities' },
  { symbol: 'WHEAT', name: 'Wheat', category: 'commodities' },
  
  // ETFs
  { symbol: 'QQQ', name: 'Invesco QQQ Trust', category: 'etfs' },
  { symbol: 'IWM', name: 'iShares Russell 2000 ETF', category: 'etfs' },
  { symbol: 'DIA', name: 'SPDR Dow Jones Industrial Average ETF', category: 'etfs' },
  { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', category: 'etfs' },
  { symbol: 'GLD', name: 'SPDR Gold Shares', category: 'etfs' },
  { symbol: 'USO', name: 'United States Oil Fund', category: 'etfs' }
];

const CATEGORY_COLORS = {
  stocks: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  crypto: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  forex: 'bg-green-500/10 text-green-400 border-green-500/20',
  commodities: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  etfs: 'bg-purple-500/10 text-purple-400 border-purple-500/20'
};

const CATEGORY_LABELS = {
  stocks: 'Stocks',
  crypto: 'Crypto',
  forex: 'Forex',
  commodities: 'Commodities',
  etfs: 'ETFs'
};

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

  const groupedAssets = SUPPORTED_ASSETS.reduce((acc, asset) => {
    if (!acc[asset.category]) {
      acc[asset.category] = [];
    }
    acc[asset.category].push(asset);
    return acc;
  }, {} as Record<string, AssetOption[]>);

  const selectedAsset = SUPPORTED_ASSETS.find(asset => asset.symbol === value);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">
          Trading Instrument
        </label>
        {selectedAsset && (
          <Badge className={`${CATEGORY_COLORS[selectedAsset.category]} border text-xs`}>
            {CATEGORY_LABELS[selectedAsset.category]}
          </Badge>
        )}
      </div>
      
      <Select value={value} onValueChange={handleValueChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a trading instrument..." />
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {Object.entries(groupedAssets).map(([category, assets]) => (
            <div key={category}>
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground border-b border-border">
                {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]} ({assets.length})
              </div>
              {assets.map((asset) => (
                <SelectItem 
                  key={asset.symbol} 
                  value={asset.symbol}
                  className="pl-4"
                >
                  <div className="flex items-center justify-between w-full">
                    <div>
                      <span className="font-medium">{asset.symbol}</span>
                      <span className="ml-2 text-sm text-muted-foreground">
                        {asset.name}
                      </span>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </div>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export { SUPPORTED_ASSETS };
